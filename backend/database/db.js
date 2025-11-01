const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || '/srv/storyclip/database/storyclip.db';
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Crear directorio si no existe
      const fs = require('fs-extra');
      fs.ensureDirSync(path.dirname(this.dbPath));

      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          logger.error('Error opening database:', err.message);
          this.db = null; // Asegurar que db es null en caso de error
          reject(err);
        } else {
          logger.info(`Database connected: ${this.dbPath}`);
          // Configurar modo WAL para mejor concurrencia
          this.db.run('PRAGMA journal_mode = WAL', (pragmaErr) => {
            if (pragmaErr) {
              logger.warn('Could not set WAL mode:', pragmaErr.message);
            }
            this.createTables().then(resolve).catch(reject);
          });
        }
      });
    });
  }

  async createTables() {
    const fs = require('fs-extra');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    return new Promise((resolve, reject) => {
      this.db.exec(schema, (err) => {
        if (err) {
          logger.error('Error creating tables:', err.message);
          reject(err);
        } else {
          logger.info('Database tables created successfully');
          resolve();
        }
      });
    });
  }

  // Método para verificar y reconectar si es necesario
  async ensureConnection() {
    if (!this.db) {
      logger.warn('Database connection lost, attempting to reconnect...');
      try {
        await this.init();
      } catch (error) {
        logger.error('Failed to reconnect to database:', error.message);
        throw error;
      }
    }
  }

  // Método wrapper para ejecutar operaciones con reintentos
  async executeWithRetry(operation, maxRetries = 3, retryDelay = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error.message);

        // Si es el último intento, lanzar el error
        if (attempt === maxRetries) {
          throw error;
        }

        // Si el error es de conexión cerrada, marcar para reconectar
        if (error.message && (
          error.message.includes('Database is closed') ||
          error.message.includes('SQLITE_MISUSE')
        )) {
          this.db = null;
        }

        // Esperar antes de reintentar (con backoff exponencial)
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  // Método genérico para queries
  async query(sql, params = []) {
    return this.executeWithRetry(async () => {
      await this.ensureConnection();
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database connection is not available'));
          return;
        }
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            logger.error('Database query error:', err.message);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    });
  }

  // Método para insert/update/delete
  async run(sql, params = []) {
    return this.executeWithRetry(async () => {
      await this.ensureConnection();
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database connection is not available'));
          return;
        }
        this.db.run(sql, params, function(err) {
          if (err) {
            logger.error('Database run error:', err.message);
            reject(err);
          } else {
            resolve({ id: this.lastID, changes: this.changes });
          }
        });
      });
    });
  }

  // Método para obtener un solo registro
  async get(sql, params = []) {
    return this.executeWithRetry(async () => {
      await this.ensureConnection();
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database connection is not available'));
          return;
        }
        this.db.get(sql, params, (err, row) => {
          if (err) {
            logger.error('Database get error:', err.message);
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    });
  }

  // Método para transacciones
  async transaction(callback) {
    return this.executeWithRetry(async () => {
      await this.ensureConnection();
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database connection is not available'));
          return;
        }
        this.db.serialize(() => {
          this.db.run('BEGIN TRANSACTION');

          callback(this.db)
            .then(() => {
              this.db.run('COMMIT', (err) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                } else {
                  resolve();
                }
              });
            })
            .catch((err) => {
              this.db.run('ROLLBACK');
              reject(err);
            });
        });
      });
    });
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            logger.error('Error closing database:', err.message);
          } else {
            logger.info('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Singleton instance
const db = new Database();

module.exports = db;

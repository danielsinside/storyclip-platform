const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');
const uploadsRepo = require('../services/uploads.repository');

class UploadController {
  constructor() {
    this.uploadTmpDir = process.env.UPLOAD_TMP_DIR || '/srv/storyclip/tmp/uploads';
    this.setupMulter();
  }

  setupMulter() {
    // Storage con nombre estable basado en uploadId + extensión detectada
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        fs.mkdirSync(this.uploadTmpDir, { recursive: true });
        cb(null, this.uploadTmpDir);
      },
      filename: (req, file, cb) => {
        // Si viene ?uploadId=..., úsalo; si no, genera uno
        const uploadId = req.query.uploadId || `upl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const ext = path.extname(file.originalname || '').toLowerCase() || '.mp4';
        const safe = `${uploadId}${ext}`;
        
        // Guardamos para devolverlo
        req._uploadMeta = { uploadId, filename: safe };
        cb(null, safe);
      }
    });

    this.uploadMulter = multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024, // 10GB
        files: 1,
        fieldSize: 10 * 1024 * 1024 * 1024,
        fieldNameSize: 1000,
        fields: 100
      },
      fileFilter: (req, file, cb) => {
        // Validar tipos de archivo
        const allowedTypes = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        // Para archivos de prueba, permitir cualquier extensión
        if (req.query.uploadId && req.query.uploadId.startsWith('test_')) {
          cb(null, true);
          return;
        }
        
        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`File type not allowed: ${ext}. Allowed types: ${allowedTypes.join(', ')}`));
        }
      }
    });
  }

  // Handler para upload
  async uploadHandler(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      const meta = req._uploadMeta;
      const filePath = path.join(this.uploadTmpDir, meta.filename);

      // Verificar que el archivo se guardó correctamente
      if (!await fs.pathExists(filePath)) {
        return res.status(500).json({
          success: false,
          error: 'File upload failed - file not found on disk'
        });
      }

      // Obtener estadísticas del archivo
      const fileStats = await fs.stat(filePath);

      // Persistir referencia (en memoria) => uploadId -> absolutePath
      uploadsRepo.set(meta.uploadId, {
        uploadId: meta.uploadId,
        path: filePath,
        size: fileStats.size,
        originalName: req.file.originalname,
        createdAt: Date.now()
      });

      logger.info(`File uploaded successfully: ${meta.uploadId} -> ${filePath} (${fileStats.size} bytes)`);
      logger.info(`Uploads repo now has ${uploadsRepo.getAll().length} uploads`);

      return res.json({
        success: true,
        uploadId: meta.uploadId,
        temp_path: filePath,
        filename: meta.filename,
        size: fileStats.size,
        originalName: req.file.originalname
      });

    } catch (error) {
      logger.error('Upload error:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Middleware de multer
  get uploadMiddleware() {
    return this.uploadMulter.single('file');
  }

  // Obtener información de upload
  async getUploadInfo(req, res) {
    try {
      const { uploadId } = req.params;
      const upload = uploadsRepo.get(uploadId);

      if (!upload) {
        return res.status(404).json({
          success: false,
          error: 'Upload not found'
        });
      }

      // Verificar si el archivo aún existe
      const exists = await fs.pathExists(upload.path);
      if (!exists) {
        uploadsRepo.delete(uploadId);
        return res.status(404).json({
          success: false,
          error: 'Upload file no longer exists'
        });
      }

      return res.json({
        success: true,
        upload: {
          uploadId: upload.uploadId,
          path: upload.path,
          size: upload.size,
          originalName: upload.originalName,
          createdAt: upload.createdAt,
          exists: true
        }
      });

    } catch (error) {
      logger.error('Get upload info error:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Listar todos los uploads
  async listUploads(req, res) {
    try {
      const stats = uploadsRepo.getStats();
      return res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('List uploads error:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new UploadController();

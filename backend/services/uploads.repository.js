/**
 * Repositorio en memoria para trackear uploads temporales
 * Mantiene el mapeo uploadId -> path absoluto del archivo
 */

class UploadsRepository {
  constructor() {
    // Map<uploadId, { uploadId, path, size, createdAt }>
    this.uploads = new Map();
  }

  /**
   * Guardar info del upload
   */
  set(uploadId, data) {
    this.uploads.set(uploadId, {
      uploadId,
      path: data.path,
      size: data.size || null,
      createdAt: data.createdAt || Date.now()
    });
  }

  /**
   * Obtener info del upload
   */
  get(uploadId) {
    return this.uploads.get(uploadId) || null;
  }

  /**
   * Eliminar registro del upload
   */
  delete(uploadId) {
    return this.uploads.delete(uploadId);
  }

  /**
   * Limpiar uploads antiguos (más de 1 hora)
   */
  cleanup(maxAgeMs = 60 * 60 * 1000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [uploadId, data] of this.uploads.entries()) {
      if (now - data.createdAt > maxAgeMs) {
        this.uploads.delete(uploadId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Obtener todos los uploads
   */
  getAll() {
    return Array.from(this.uploads.values());
  }

  /**
   * Contar uploads
   */
  count() {
    return this.uploads.size;
  }

  /**
   * Detener limpieza automática (alias para cleanup final)
   * Limpia todos los uploads sin importar la edad
   */
  stopCleanup() {
    const cleaned = this.cleanup(0); // maxAge = 0 limpia todo
    return cleaned;
  }
}

module.exports = new UploadsRepository();















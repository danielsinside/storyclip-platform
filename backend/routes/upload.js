const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');

const router = express.Router();

// Configurar multer para subir videos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../tmp/uploads');
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB límite
    files: 1, // Un archivo a la vez
    fieldSize: 10 * 1024 * 1024 * 1024, // 10GB
    fieldNameSize: 1000,
    fields: 100
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo videos
    const allowedTypes = /mp4|mov|avi|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // Permitir si la extensión es correcta, independientemente del MIME type
    // (algunos clientes envían application/octet-stream para videos)
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de video (MP4, MOV, AVI, MKV, WEBM)'));
    }
  }
});

/**
 * POST /api/v1/upload
 * Sube un video local y retorna la URL
 */
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo'
      });
    }

    logger.info(`Video subido: ${req.file.filename} (${req.file.size} bytes)`);

    // Mover el archivo a la carpeta public/uploads para que sea accesible vía HTTPS
    const publicUploadsDir = path.join(__dirname, '../public/uploads');
    await fs.ensureDir(publicUploadsDir);
    
    const publicFilename = req.file.filename;
    const publicPath = path.join(publicUploadsDir, publicFilename);
    
    await fs.move(req.file.path, publicPath, { overwrite: true });

    // Construir URL pública
    const baseUrl = process.env.PUBLIC_URL || `https://${req.get('host')}`;
    const videoUrl = `${baseUrl}/uploads/${publicFilename}`;

    logger.info(`Video disponible en: ${videoUrl}`);

    res.json({
      success: true,
      url: videoUrl,
      filename: publicFilename,
      size: req.file.size,
      originalname: req.file.originalname
    });

  } catch (error) {
    logger.error('Error subiendo video:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir el video',
      details: error.message
    });
  }
});

module.exports = router;

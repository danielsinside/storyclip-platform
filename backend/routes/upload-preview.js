const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

// Configurar multer para uploads temporales
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/srv/storyclip/tmp/uploads';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Forzar siempre extensión .mp4 para videos
    const uniqueName = `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB límite
  }
});

// POST /api/upload-preview (sin autenticación temporalmente)
router.post('/upload-preview', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No video file provided',
        code: 'NO_FILE'
      });
    }

    const tenant = 'stories'; // Temporalmente hardcodeado
    const filePath = req.file.path;
    const fileName = req.file.filename;
    
    // Mover archivo al directorio de outputs para acceso directo
    const outputDir = '/srv/storyclip/outputs/uploads';
    fs.ensureDirSync(outputDir);
    const outputPath = path.join(outputDir, fileName);
    fs.moveSync(filePath, outputPath);
    
    // Generar URL de preview inmediata
    const previewUrl = `https://api.creatorsflow.app/outputs/uploads/${fileName}`;
    
    // Guardar información del upload en memoria (para cleanup posterior)
    const uploadInfo = {
      id: fileName,
      tenant: tenant,
      originalName: req.file.originalname,
      size: req.file.size,
      path: outputPath, // Usar la ruta final donde se movió el archivo
      uploadedAt: new Date().toISOString(),
      previewUrl: previewUrl
    };

    // Guardar en uploads repository
    const uploadsRepo = require('../services/uploads.repository');
    uploadsRepo.set(fileName, uploadInfo);

    res.json({
      success: true,
      uploadId: fileName,
      previewUrl: previewUrl,
      tenant: tenant,
      fileInfo: {
        originalName: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      },
      uploadedAt: uploadInfo.uploadedAt
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      error: 'Upload failed',
      code: 'UPLOAD_ERROR',
      message: error.message
    });
  }
});

module.exports = router;

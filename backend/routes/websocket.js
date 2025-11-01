const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const logger = require('../utils/logger');
const jobMonitoringService = require('../services/job-monitoring.service');

const router = express.Router();

// Crear servidor HTTP para WebSocket
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Almacenar conexiones WebSocket por jobId
const connections = new Map();

// Manejar conexiones WebSocket
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const jobId = url.searchParams.get('jobId');
  
  if (!jobId) {
    ws.close(1008, 'jobId parameter required');
    return;
  }

  logger.info(`WebSocket connection established for job: ${jobId}`);

  // Almacenar conexión
  if (!connections.has(jobId)) {
    connections.set(jobId, new Set());
  }
  connections.get(jobId).add(ws);

  // Enviar estado inicial del job
  const initialStatus = jobMonitoringService.getJobStatus(jobId);
  if (initialStatus) {
    ws.send(JSON.stringify({
      type: 'status',
      data: initialStatus
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Job not found' }
    }));
  }

  // Manejar mensajes del cliente
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'subscribe':
          // Ya está suscrito por jobId
          break;
        default:
          logger.warn(`Unknown WebSocket message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('Error parsing WebSocket message:', error);
    }
  });

  // Manejar cierre de conexión
  ws.on('close', () => {
    logger.info(`WebSocket connection closed for job: ${jobId}`);
    
    if (connections.has(jobId)) {
      connections.get(jobId).delete(ws);
      if (connections.get(jobId).size === 0) {
        connections.delete(jobId);
      }
    }
  });

  // Manejar errores
  ws.on('error', (error) => {
    logger.error(`WebSocket error for job ${jobId}:`, error);
  });
});

// Escuchar eventos del servicio de monitoreo
jobMonitoringService.on('jobUpdated', (jobData) => {
  const { jobId } = jobData;
  
  if (connections.has(jobId)) {
    const message = JSON.stringify({
      type: 'status',
      data: jobData
    });

    connections.get(jobId).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
});

jobMonitoringService.on('jobCompleted', (jobData) => {
  const { jobId } = jobData;
  
  if (connections.has(jobId)) {
    const message = JSON.stringify({
      type: 'completed',
      data: jobData
    });

    connections.get(jobId).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        ws.close(1000, 'Job completed');
      }
    });
    
    connections.delete(jobId);
  }
});

// Endpoint para obtener información del WebSocket
router.get('/ws/info', (req, res) => {
  res.json({
    success: true,
    websocketUrl: `wss://${req.get('host')}/ws?jobId={jobId}`,
    supportedMessageTypes: ['ping', 'subscribe'],
    supportedEvents: ['status', 'completed', 'error']
  });
});

// Endpoint para obtener estado de un job específico
router.get('/ws/job/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  const status = jobMonitoringService.getJobStatus(jobId);
  
  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  res.json({
    success: true,
    data: status
  });
});

// Endpoint para obtener todos los jobs activos
router.get('/ws/jobs/active', (req, res) => {
  const activeJobs = jobMonitoringService.getActiveJobs();
  
  res.json({
    success: true,
    data: activeJobs
  });
});

// Endpoint para obtener estadísticas del monitoreo
router.get('/ws/stats', (req, res) => {
  const stats = jobMonitoringService.getStats();
  
  res.json({
    success: true,
    data: stats
  });
});

module.exports = { router, server, wss };







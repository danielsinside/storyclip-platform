#!/usr/bin/env node

const axios = require('axios');
const logger = require('./utils/logger');

// Configuración del modo NATURAL
const NATURAL_DELAYS = {
  min: 6000,    // 6 segundos mínimo
  max: 12000,   // 12 segundos máximo
  jitter: 0.1   // ±10% de variación
};

// Función para generar delay natural
function generateNaturalDelay() {
  const baseDelay = Math.random() * (NATURAL_DELAYS.max - NATURAL_DELAYS.min) + NATURAL_DELAYS.min;
  const jitter = baseDelay * NATURAL_DELAYS.jitter * (Math.random() * 2 - 1);
  return Math.round(baseDelay + jitter);
}

// Función para formatear fecha
function formatDateInTimezone(date, timezone = 'America/New_York') {
  const targetDate = new Date(date.toLocaleString("en-US", {timeZone: timezone}));
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  const seconds = String(targetDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// Función para publicar un clip
async function publishClip(clipNumber, delayMs) {
  const publicationTime = new Date(Date.now() + delayMs);
  const creationTime = new Date();
  
  const clipUrl = `https://storyclip.creatorsflow.app/outputs/job_1760606050767_8d6tufo84/clip_${String(clipNumber).padStart(3, '0')}.mp4`;
  
  const payload = {
    normalizedUrl: clipUrl,
    blogId: '5372118', // Daniel's Inside
    userId: '4172139',
    creatorUserMail: 'daniel@creatorsflow.app',
    publicationDateTime: formatDateInTimezone(publicationTime),
    creationDateTime: formatDateInTimezone(creationTime)
  };
  
  try {
    logger.info(`🚀 Programando publicación del clip ${clipNumber} para ${publicationTime.toLocaleString()}`);
    
    const response = await axios.post('http://localhost:3000/api/publish-story', payload);
    
    if (response.data.success) {
      logger.info(`✅ Clip ${clipNumber} programado exitosamente: ${response.data.result.data.id}`);
      return { success: true, clipNumber, publicationId: response.data.result.data.id };
    } else {
      logger.error(`❌ Error programando clip ${clipNumber}: ${response.data.error}`);
      return { success: false, clipNumber, error: response.data.error };
    }
  } catch (error) {
    logger.error(`❌ Error en clip ${clipNumber}: ${error.message}`);
    return { success: false, clipNumber, error: error.message };
  }
}

// Función principal
async function publishAllClips() {
  logger.info('🎬 Iniciando publicación automática con modo NATURAL');
  logger.info(`📊 Configuración: ${NATURAL_DELAYS.min/1000}-${NATURAL_DELAYS.max/1000} segundos con ±${NATURAL_DELAYS.jitter*100}% jitter`);
  
  const results = [];
  let currentDelay = 0;
  
  // Publicar clips del 2 al 50 (el 1 ya se publicó)
  for (let clipNumber = 2; clipNumber <= 50; clipNumber++) {
    const delay = generateNaturalDelay();
    currentDelay += delay;
    
    logger.info(`⏰ Clip ${clipNumber}: Delay de ${Math.round(delay/1000)} segundos (Total: ${Math.round(currentDelay/1000)} segundos)`);
    
    const result = await publishClip(clipNumber, currentDelay);
    results.push(result);
    
    // Pequeña pausa entre requests para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumen final
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  logger.info(`🎉 Publicación completada: ${successful} exitosos, ${failed} fallidos`);
  logger.info(`⏱️ Tiempo total estimado: ${Math.round(currentDelay/1000)} segundos (${Math.round(currentDelay/1000/60)} minutos)`);
  
  if (failed > 0) {
    logger.warn('❌ Clips fallidos:');
    results.filter(r => !r.success).forEach(r => {
      logger.warn(`  - Clip ${r.clipNumber}: ${r.error}`);
    });
  }
  
  return results;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  publishAllClips()
    .then(() => {
      logger.info('✅ Script completado');
      process.exit(0);
    })
    .catch(error => {
      logger.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { publishAllClips, publishClip, generateNaturalDelay };

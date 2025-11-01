// Endpoint modificado para soportar publicación masiva
const express = require('express');
const router = express.Router();

// Función helper para formatear fecha en timezone
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

// Función para publicar un solo post
async function publishSinglePost(post, delayMode = 'NATURAL') {
  const { normalizedUrl, mediaId, blogId, userId = '4172139', creatorUserMail = 'daniel@creatorsflow.app', publicationDateTime, creationDateTime, message } = post;

  if ((!normalizedUrl && !mediaId) || !blogId) {
    throw new Error('mediaId (or normalizedUrl) and blogId are required');
  }

  const publishUrl = `https://app.metricool.com/api/v2/scheduler/posts?userId=${userId}&blogId=${blogId}`;
  
  // Use provided publication date/time or default to immediate
  let publishTime;
  let creationTime;
  
  if (publicationDateTime) {
    // Parse the formatted date string (YYYY-MM-DDTHH:MM:SS) - already in local timezone
    publishTime = new Date(publicationDateTime); // Don't add Z, it's already local time
    creationTime = creationDateTime ? new Date(creationDateTime) : new Date();
    
    // Validate that the scheduled time is in the future (allow 1 minute buffer)
    const now = new Date();
    const bufferTime = new Date(now.getTime() + 60000); // 1 minute buffer
    
    console.log(`Time validation - Now: ${now.toISOString()}, Publish: ${publishTime.toISOString()}, Buffer: ${bufferTime.toISOString()}`);
    console.log(`Time difference: ${publishTime.getTime() - now.getTime()}ms, Buffer: ${bufferTime.getTime() - now.getTime()}ms`);
    
    if (publishTime <= bufferTime) {
      console.warn(`Publication time too close - Publish: ${publishTime.toISOString()}, Buffer: ${bufferTime.toISOString()}`);
      throw new Error('La fecha y hora de publicación debe ser al menos 1 minuto en el futuro');
    }
  } else {
    // Default to immediate publication (current time + 30 seconds)
    const now = new Date();
    publishTime = new Date(now.getTime() + 30000);
    creationTime = now;
  }
  
  // Log publication details
  const isScheduled = publicationDateTime && new Date(publicationDateTime) > new Date();
  const mode = isScheduled ? 'programada' : 'inmediata';
  console.log(`Publishing story to Facebook via Metricool - BlogId: ${blogId}, Modo: ${mode}`);
  console.log(`Creation time: ${creationTime.toISOString()}, Publication time: ${publishTime.toISOString()}`);
  
  const postData = {
    text: message || "", // Usar el mensaje proporcionado
    autoPublish: true,
    saveExternalMediaFiles: true, // Metricool descarga y guarda el archivo antes de publicar
    publicationDate: {
      dateTime: formatDateInTimezone(publishTime, 'America/New_York'), // yyyy-MM-ddTHH:mm:ss format in local timezone
      timezone: "America/New_York" // Timezone
    },
    creationDate: {
      dateTime: formatDateInTimezone(creationTime, 'America/New_York'), // yyyy-MM-ddTHH:mm:ss format in local timezone
      timezone: "America/New_York" // Timezone
    },
    providers: [
      {
        network: "facebook"
      }
    ],
    facebookData: {
      type: "STORY"
    },
    media: mediaId ? 
      { mediaId: mediaId } : 
      [normalizedUrl], // Array de URLs como en la configuración original
    mediaAltText: [null], // Alt text para accesibilidad
    creatorUserMail: creatorUserMail,
    creatorUserId: parseInt(userId)
  };
  
  const response = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      'X-Mc-Auth': process.env.METRICOOL_USER_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Metricool API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`Story published successfully to blogId ${blogId}: ${JSON.stringify(result)}`);
  
  return {
    success: true,
    result: result,
    post: post
  };
}

// Endpoint modificado que soporta tanto posts individuales como arrays
router.post('/publish-story', async (req, res) => {
  try {
    const { jobId, delayMode = 'NATURAL', posts, normalizedUrl, mediaId, blogId, userId = '4172139', creatorUserMail = 'daniel@creatorsflow.app', publicationDateTime, creationDateTime, message } = req.body;

    // CASO A: Array de posts (publicación masiva)
    if (posts && Array.isArray(posts) && posts.length > 0) {
      console.log(`[BATCH] Procesando ${posts.length} posts para jobId: ${jobId}`);
      
      const results = [];
      let successCount = 0;
      let failCount = 0;
      
      // Procesar posts secuencialmente para evitar rate limits
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        try {
          console.log(`[BATCH] Procesando post ${i + 1}/${posts.length}: ${post.message || post.normalizedUrl}`);
          
          const result = await publishSinglePost(post, delayMode);
          results.push({
            success: true,
            postId: result.result?.data?.id || null,
            post: post,
            index: i + 1
          });
          successCount++;
          
          // Pequeña pausa entre posts para evitar rate limits
          if (i < posts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo entre posts
          }
          
        } catch (error) {
          console.error(`[BATCH] Error en post ${i + 1}:`, error.message);
          results.push({
            success: false,
            error: error.message,
            post: post,
            index: i + 1
          });
          failCount++;
        }
      }
      
      console.log(`[BATCH] Completado: ${successCount} exitosos, ${failCount} fallidos`);
      
      return res.json({
        success: successCount > 0,
        count: results.length,
        successful: successCount,
        failed: failCount,
        results: results,
        message: `Publicación masiva completada: ${successCount} exitosos, ${failCount} fallidos`
      });
    }
    
    // CASO B: Post individual (compatibilidad con código existente)
    if ((!normalizedUrl && !mediaId) || !blogId) {
      return res.status(400).json({
        success: false,
        error: 'mediaId (or normalizedUrl) and blogId are required'
      });
    }
    
    console.log(`[SINGLE] Procesando post individual: ${message || normalizedUrl}`);
    
    const result = await publishSinglePost({
      normalizedUrl,
      mediaId,
      blogId,
      userId,
      creatorUserMail,
      publicationDateTime,
      creationDateTime,
      message
    }, delayMode);
    
    res.json({
      success: true,
      result: result.result
    });
    
  } catch (error) {
    console.error(`Error en publish-story: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../middleware/error');

class StoryService {
  constructor() {
    // In-memory store (por ahora)
    this.stories = new Map();
    this.jobIdToStoryId = new Map();
  }

  // Crear nuevo story
  createStory(data) {
    const story = {
      id: uuidv4(),
      jobId: uuidv4(),
      title: data.title || 'Untitled Story',
      description: data.description || '',
      videoUrl: data.videoUrl,
      status: 'pending', // pending, processing, completed, failed
      progress: 0,
      outputs: [],
      metadata: {
        originalUrl: data.videoUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      error: null
    };

    this.stories.set(story.id, story);
    this.jobIdToStoryId.set(story.jobId, story.id);

    logger.info(`Story created: ${story.id} with jobId: ${story.jobId}`);
    return story;
  }

  // Obtener story por ID
  getStoryById(id) {
    const story = this.stories.get(id);
    if (!story) {
      throw new NotFoundError(`Story with id ${id} not found`);
    }
    return story;
  }

  // Obtener story por jobId
  getStoryByJobId(jobId) {
    const storyId = this.jobIdToStoryId.get(jobId);
    if (!storyId) {
      throw new NotFoundError(`Story with jobId ${jobId} not found`);
    }
    return this.getStoryById(storyId);
  }

  // Obtener todos los stories
  getAllStories(options = {}) {
    const { limit = 50, offset = 0, status } = options;
    
    let stories = Array.from(this.stories.values());
    
    // Filtrar por status si se especifica
    if (status) {
      stories = stories.filter(story => story.status === status);
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    stories.sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));
    
    // Paginación
    const total = stories.length;
    const paginatedStories = stories.slice(offset, offset + limit);
    
    return {
      stories: paginatedStories,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  // Actualizar story
  updateStory(id, updates) {
    const story = this.getStoryById(id);
    
    const updatedStory = {
      ...story,
      ...updates,
      metadata: {
        ...story.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    this.stories.set(id, updatedStory);
    logger.info(`Story updated: ${id}`);
    return updatedStory;
  }

  // Actualizar story por jobId (para webhooks)
  updateStoryByJobId(jobId, updates) {
    const story = this.getStoryByJobId(jobId);
    return this.updateStory(story.id, updates);
  }

  // Eliminar story
  deleteStory(id) {
    const story = this.getStoryById(id);
    
    // Limpiar referencias
    this.jobIdToStoryId.delete(story.jobId);
    this.stories.delete(id);
    
    logger.info(`Story deleted: ${id}`);
    return { success: true, message: 'Story deleted successfully' };
  }

  // Actualizar progreso del procesamiento
  updateProgress(jobId, progress) {
    const story = this.getStoryByJobId(jobId);
    return this.updateStory(story.id, { progress });
  }

  // Marcar como procesando
  markAsProcessing(jobId) {
    const story = this.getStoryByJobId(jobId);
    return this.updateStory(story.id, { 
      status: 'processing',
      progress: 0,
      error: null
    });
  }

  // Marcar como completado
  markAsCompleted(jobId, outputs) {
    const story = this.getStoryByJobId(jobId);
    return this.updateStory(story.id, { 
      status: 'completed',
      progress: 100,
      outputs: outputs || [],
      error: null
    });
  }

  // Marcar como fallido
  markAsFailed(jobId, error) {
    const story = this.getStoryByJobId(jobId);
    return this.updateStory(story.id, { 
      status: 'failed',
      progress: 0,
      error: error || 'Unknown error occurred'
    });
  }

  // Agregar output al story
  addOutput(jobId, output) {
    const story = this.getStoryByJobId(jobId);
    const updatedOutputs = [...story.outputs, output];
    return this.updateStory(story.id, { outputs: updatedOutputs });
  }

  // Validar datos del story
  validateStoryData(data) {
    const errors = [];

    if (!data.videoUrl) {
      errors.push('videoUrl is required');
    } else if (!this.isValidUrl(data.videoUrl)) {
      errors.push('videoUrl must be a valid URL');
    }

    if (data.title && typeof data.title !== 'string') {
      errors.push('title must be a string');
    }

    if (data.description && typeof data.description !== 'string') {
      errors.push('description must be a string');
    }

    if (errors.length > 0) {
      throw new ValidationError(`Validation failed: ${errors.join(', ')}`);
    }

    return true;
  }

  // Validar URL
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Obtener estadísticas
  getStats() {
    const stories = Array.from(this.stories.values());
    
    const stats = {
      total: stories.length,
      pending: stories.filter(s => s.status === 'pending').length,
      processing: stories.filter(s => s.status === 'processing').length,
      completed: stories.filter(s => s.status === 'completed').length,
      failed: stories.filter(s => s.status === 'failed').length
    };

    return stats;
  }

  // Limpiar stories antiguos (más de 7 días)
  cleanupOldStories() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let cleanedCount = 0;
    
    for (const [id, story] of this.stories.entries()) {
      const createdAt = new Date(story.metadata.createdAt);
      if (createdAt < sevenDaysAgo && story.status === 'completed') {
        this.deleteStory(id);
        cleanedCount++;
      }
    }

    logger.info(`Cleaned up ${cleanedCount} old stories`);
    return cleanedCount;
  }
}

module.exports = new StoryService();


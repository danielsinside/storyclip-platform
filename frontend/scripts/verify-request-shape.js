#!/usr/bin/env node

/**
 * Script de verificación de la estructura del request para clips manuales
 * Verifica que los efectos visuales se envíen correctamente al backend
 */

// Simular el request que se envía desde Manual.tsx
function createTestRequest() {
  const manualClips = [
    { start: 0, end: 10 },
    { start: 15, end: 25 },
    { start: 30, end: 40 }
  ];

  const horizontalFlip = true;
  const clipIndicator = 'temporal';
  const indicatorPosition = 'top-left';
  const indicatorSize = 90;
  const indicatorTextColor = '#FFFFFF';
  const indicatorBgColor = '#FF2D55';
  const indicatorOpacity = 0.8;
  const indicatorStyle = 'rounded';
  const filterType = 'vintage';
  const overlayType = 'badge';

  // ESTRUCTURA ACTUAL (PROBLEMÁTICA)
  const currentRequest = {
    uploadId: 'test-upload-123',
    mode: 'manual',
    preset: 'storyclip_social_916',
    clips: manualClips.map((clip, i) => ({
      start: clip.start,
      end: clip.end,
      effects: {
        mirrorHorizontal: horizontalFlip,
        ...(filterType !== 'none' ? {
          color: {
            brightness: 0.05,
            contrast: 1.2,
            saturation: 1.1
          }
        } : {}),
        ...(clipIndicator !== 'none' ? {
          indicator: {
            enabled: true,
            label: String(i + 1),
            position: indicatorPosition || 'top-left',
            size: indicatorSize || 90,
            textColor: indicatorTextColor || '#FFFFFF',
            bgColor: indicatorBgColor || '#FF2D55',
            opacity: indicatorOpacity ?? 0.8,
            style: indicatorStyle || 'rounded'
          }
        } : {})
      }
    })),
    ...(filterType !== 'none' ? {
      filters: {
        color: {
          brightness: 0.05,
          contrast: 1.2,
          saturation: 1.1
        },
        mirrorHorizontal: horizontalFlip
      }
    } : {}),
    ...(overlayType !== 'none' ? {
      overlays: {
        type: overlayType,
        intensity: 0.8
      }
    } : {}),
    metadata: {
      title: 'Test Video',
      description: 'Test Description',
      keywords: 'test, video',
      seed: 'natural',
      delayMode: 'natural',
      visual: {
        mirrorHorizontal: horizontalFlip,
        indicator: clipIndicator !== 'none'
      }
    }
  };

  // ESTRUCTURA CORREGIDA (RECOMENDADA)
  const correctedRequest = {
    uploadId: 'test-upload-123',
    mode: 'manual',
    preset: 'storyclip_social_916',
    clips: manualClips.map((clip, i) => ({
      start: clip.start,
      end: clip.end,
      effects: {
        mirrorHorizontal: horizontalFlip,
        color: {
          brightness: 0.05,
          contrast: 1.2,
          saturation: 1.1
        },
        indicator: {
          enabled: true,
          label: String(i + 1),
          position: indicatorPosition,
          size: indicatorSize,
          textColor: indicatorTextColor,
          bgColor: indicatorBgColor,
          opacity: indicatorOpacity,
          style: indicatorStyle
        }
      }
    })),
    metadata: {
      title: 'Test Video',
      description: 'Test Description',
      keywords: 'test, video',
      seed: 'natural',
      delayMode: 'natural'
    }
  };

  return { currentRequest, correctedRequest };
}

function verifyRequestStructure() {
  console.log('🔍 Verificando estructura del request para clips manuales...\n');

  const { currentRequest, correctedRequest } = createTestRequest();

  // Verificaciones para la estructura actual
  console.log('📋 ESTRUCTURA ACTUAL:');
  console.log('✅ uploadId presente:', !!currentRequest.uploadId);
  console.log('✅ mode = "manual":', currentRequest.mode === 'manual');
  console.log('✅ clips array presente:', Array.isArray(currentRequest.clips));
  console.log('✅ clips[0].effects presente:', !!currentRequest.clips[0]?.effects);
  console.log('✅ clips[0].effects.mirrorHorizontal:', currentRequest.clips[0]?.effects?.mirrorHorizontal);
  console.log('✅ clips[0].effects.indicator presente:', !!currentRequest.clips[0]?.effects?.indicator);
  console.log('✅ clips[0].effects.color presente:', !!currentRequest.clips[0]?.effects?.color);

  // PROBLEMAS IDENTIFICADOS
  console.log('\n❌ PROBLEMAS IDENTIFICADOS:');
  console.log('❌ Duplicación de mirrorHorizontal en filters:', !!currentRequest.filters?.mirrorHorizontal);
  console.log('❌ Duplicación de mirrorHorizontal en metadata.visual:', !!currentRequest.metadata?.visual?.mirrorHorizontal);
  console.log('❌ Duplicación de efectos de color en filters:', !!currentRequest.filters?.color);
  console.log('❌ Estructura confusa con múltiples ubicaciones para los mismos efectos');

  // Verificaciones para la estructura corregida
  console.log('\n📋 ESTRUCTURA CORREGIDA:');
  console.log('✅ uploadId presente:', !!correctedRequest.uploadId);
  console.log('✅ mode = "manual":', correctedRequest.mode === 'manual');
  console.log('✅ clips array presente:', Array.isArray(correctedRequest.clips));
  console.log('✅ clips[0].effects.mirrorHorizontal:', correctedRequest.clips[0]?.effects?.mirrorHorizontal);
  console.log('✅ clips[0].effects.indicator presente:', !!correctedRequest.clips[0]?.effects?.indicator);
  console.log('✅ clips[0].effects.color presente:', !!correctedRequest.clips[0]?.effects?.color);
  console.log('✅ Sin duplicaciones en filters:', !correctedRequest.filters);
  console.log('✅ Sin duplicaciones en metadata.visual:', !correctedRequest.metadata?.visual);

  // Verificaciones específicas de efectos
  console.log('\n🎯 VERIFICACIÓN DE EFECTOS:');
  const clip0 = correctedRequest.clips[0];
  console.log('✅ mirrorHorizontal en clips[0].effects:', clip0?.effects?.mirrorHorizontal === true);
  console.log('✅ indicator.enabled en clips[0].effects:', clip0?.effects?.indicator?.enabled === true);
  console.log('✅ indicator.position en clips[0].effects:', clip0?.effects?.indicator?.position === 'top-left');
  console.log('✅ indicator.opacity en clips[0].effects:', clip0?.effects?.indicator?.opacity === 0.8);
  console.log('✅ color.brightness en clips[0].effects:', clip0?.effects?.color?.brightness === 0.05);
  console.log('✅ color.contrast en clips[0].effects:', clip0?.effects?.color?.contrast === 1.2);
  console.log('✅ color.saturation en clips[0].effects:', clip0?.effects?.color?.saturation === 1.1);

  // Resultado final
  const hasProblems = !!currentRequest.filters || !!currentRequest.metadata?.visual;
  const isCorrect = !hasProblems && 
    correctedRequest.clips[0]?.effects?.mirrorHorizontal === true &&
    correctedRequest.clips[0]?.effects?.indicator?.enabled === true &&
    correctedRequest.clips[0]?.effects?.color?.brightness === 0.05;

  console.log('\n🏁 RESULTADO:');
  if (isCorrect) {
    console.log('✅ PASS - Estructura corregida es válida');
  } else {
    console.log('❌ FAIL - Estructura actual tiene problemas');
  }

  return { hasProblems, isCorrect };
}

// Ejecutar verificación
const result = verifyRequestStructure();

// Salir con código de error si hay problemas
process.exit(result.hasProblems ? 1 : 0);

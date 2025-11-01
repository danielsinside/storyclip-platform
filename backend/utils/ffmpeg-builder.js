/**
 * FFmpeg Command Builder - Construcción segura de comandos FFmpeg
 * Resuelve el bug de parsing de presets y añade soporte completo de overlays
 */

const { parseArgsStringToArgv } = require('string-argv');
const path = require('path');

/**
 * Extrae y elimina una opción (-vf/-filter:v/-af/-filter:a) del cmd de preset.
 * Devuelve { value, cmdWithout }.
 */
function extractOption(cmd, flags) {
  const argv = parseArgsStringToArgv(cmd);
  const out = [];
  let value = null;

  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const isFlag = flags.includes(t);
    if (isFlag) {
      // valor inmediato (si hay)
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        value = next;
        i++; // saltar valor
      } else {
        value = ''; // flag sin valor explícito
      }
      continue;
    }
    // También soporta sintaxis -vf=xxx
    const eqIdx = t.indexOf('=');
    if (eqIdx > 0) {
      const key = t.slice(0, eqIdx);
      const val = t.slice(eqIdx + 1);
      if (flags.includes(key)) {
        value = val;
        continue;
      }
    }
    out.push(t);
  }
  return { value, cmdWithout: out.join(' ') };
}

/**
 * Limpia tokens peligrosos del preset (no permitir -i, -map, output path, etc).
 * Mantiene solo opciones de codec/quality/movflags/pix_fmt, etc.
 */
function sanitizePresetArgs(cmd) {
  const argv = parseArgsStringToArgv(cmd);
  const keep = [];
  const banned = new Set(['-i', '-map', '-progress']); // las suministramos nosotros
  
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];

    // expulsar paths sueltos (posible output) si no es valor de una flag
    if (!t.startsWith('-')) {
      // si el anterior no era flag que espera valor, es sospechoso => lo saltamos
      const prev = argv[i - 1];
      const prevNeedsValue = prev && prev.startsWith('-') && !prev.startsWith('--') && !prev.endsWith('flags');
      if (!prevNeedsValue) continue;
      keep.push(t);
      continue;
    }

    // ban de flags conflictivas
    if (banned.has(t)) {
      // saltar su valor si lo tiene
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) i++;
      continue;
    }

    keep.push(t);
    // si lleva valor, conservarlo también
    const next = argv[i + 1];
    if (next && !next.startsWith('-')) {
      keep.push(next);
      i++;
    }
  }
  return keep;
}

/**
 * Mapea posiciones expresivas a coordenadas overlay (x:y).
 */
function overlayXY(position) {
  const margin = 20;
  const map = {
    'top-left'     : `${margin}:${margin}`,
    'top-right'    : `W-w-${margin}:${margin}`,
    'bottom-left'  : `${margin}:H-h-${margin}`,
    'bottom-right' : `W-w-${margin}:H-h-${margin}`,
    'center'       : `(W-w)/2:(H-h)/2`,
  };
  return map[position] || map['top-right'];
}

/**
 * Construye args de ffmpeg:
 * - Entrada(0) = video
 * - Entradas(1..N) = overlays
 * - Mezcla -vf del preset con overlay(s) vía -filter_complex
 * - Mapea video final + audio opcional
 */
function buildFFmpegArgs({ inputPath, overlayPaths = [], overlayConfigs = [], presetCmd, outputPath, threads = 2 }) {
  // 1) extraer y retirar -vf/-filter:v y -af/-filter:a del cmd de preset
  const { value: vfOpt, cmdWithout: cmdNoVf } = extractOption(presetCmd, ['-vf', '-filter:v']);
  const { value: afOpt, cmdWithout: cmdNoA }  = extractOption(cmdNoVf,   ['-af', '-filter:a']);

  // 2) sanear resto del preset (quitar -i/-map/output/etc.)
  const safeArgs = sanitizePresetArgs(cmdNoA);

  // 3) armar filter_complex si hay overlays y/o filtros de video
  let filterComplex = '';
  let current = '0:v';
  const parts = [];

  if (vfOpt && vfOpt.trim()) {
    // aplicar cadena de video filters del preset
    parts.push(`[0:v]${vfOpt}[v0]`);
    current = 'v0';
  }

  overlayPaths.forEach((_, idx) => {
    const ovIn = `${idx + 1}:v`; // 1..N
    const out = `v${idx + 1}`;
    
    // Obtener configuración del overlay si existe
    const config = overlayConfigs[idx] || {};
    const position = config.position || 'top-right';
    const opacity = config.opacity || 1.0;
    
    const xy = overlayXY(position);
    
    // Si hay opacidad < 1, aplicar colorchannelmixer para PNG con alpha
    let overlayFilter = '';
    if (opacity < 1.0 && opacity > 0) {
      overlayFilter = `[${ovIn}]format=rgba,colorchannelmixer=aa=${opacity}[ov${idx}];[${current}][ov${idx}]overlay=${xy}:format=auto:eval=init[${out}]`;
    } else {
      overlayFilter = `[${current}][${ovIn}]overlay=${xy}:format=auto:eval=init[${out}]`;
    }
    
    parts.push(overlayFilter);
    current = out;
  });

  if (parts.length > 0) {
    filterComplex = parts.join(';');
  }

  // 4) args base
  const args = [
    '-hide_banner',
    '-y',
    '-loglevel', 'error',
    '-progress', 'pipe:1',
    '-threads', String(threads),
    '-i', inputPath,
    // inputs de overlays
    ...overlayPaths.flatMap(p => ['-i', p]),
  ];

  if (filterComplex) {
    args.push('-filter_complex', filterComplex, '-map', `[${current}]`);
  } else {
    // sin overlays ni -vf => mapeamos video original
    args.push('-map', '0:v');
  }

  // audio: si el preset traía -af usamos ese chain; si no, intentamos map opcional
  if (afOpt && afOpt.trim()) {
    args.push('-filter:a', afOpt, '-map', '0:a?');
  } else {
    args.push('-map', '0:a?');
  }

  // 5) añadir args "seguros" del preset
  args.push(...safeArgs);

  // 6) salida
  args.push(outputPath);

  return args;
}

/**
 * Ejecutor: usa spawn con args construidos
 */
async function runFFmpeg(args, logger, onProgress) {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args);

    let stderr = '';
    p.stderr.on('data', d => { stderr += d.toString(); });
    p.stdout.on('data', d => {
      // -progress pipe:1 key=value\n...
      if (onProgress) onProgress(d.toString());
    });

    p.on('close', code => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`));
    });
  });
}

module.exports = {
  buildFFmpegArgs,
  runFFmpeg,
  extractOption,
  sanitizePresetArgs,
  overlayXY
};

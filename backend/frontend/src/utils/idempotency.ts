/**
 * Utilidad para construir claves de idempotencia consistentes
 * Combina hash del archivo + hash de las opciones
 */

/**
 * Calcula hash SHA-256 de un ArrayBuffer
 */
async function sha256ArrayBuffer(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Construye una clave de idempotencia única basada en:
 * - Contenido del archivo (hash SHA-256)
 * - Opciones de procesamiento (hash SHA-256)
 * 
 * Esto asegura que el mismo archivo con las mismas opciones
 * siempre genere la misma clave, permitiendo reutilizar jobs existentes.
 */
export async function buildIdempotencyKey(file: File, options: any): Promise<string> {
  try {
    // 1. Hash del contenido del archivo
    const fileBuffer = await file.arrayBuffer()
    const fileHash = await sha256ArrayBuffer(fileBuffer)
    
    // 2. Hash de las opciones (normalizadas)
    const optionsStr = JSON.stringify(options, Object.keys(options).sort())
    const optionsBuffer = new TextEncoder().encode(optionsStr)
    const optionsHash = await sha256ArrayBuffer(optionsBuffer.buffer)
    
    // 3. Combinar ambos hashes
    const idempotencyKey = `${fileHash}:${optionsHash}`
    
    console.debug('[IDEM:build]', {
      fileHash: fileHash.substring(0, 16) + '...',
      optionsHash: optionsHash.substring(0, 16) + '...',
      keyLength: idempotencyKey.length
    })
    
    return idempotencyKey
  } catch (error) {
    console.error('[IDEM:error]', error)
    // Fallback: usar timestamp + random si falla el hash
    return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

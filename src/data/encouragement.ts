/** Emotional activation: celebrate attempts, never perfection. */
const AFTER_RECORDING = [
  'Ese eres tú hablando inglés. Escúchate.',
  'Otra repetición más en el gimnasio del inglés.',
  'Fíjate en la melodía, no solo en las palabras.',
  'Equivocarse es parte del entrenamiento. Sigue.',
  'Cada toma suena un poco más natural.',
  'Así se aprende: escuchar, imitar, repetir.',
]

export function encouragement(seed: number): string {
  return AFTER_RECORDING[Math.abs(seed) % AFTER_RECORDING.length]
}

export const MIC_ERROR_COPY: Record<string, string> = {
  NotAllowedError: 'Necesito permiso para usar el micrófono. Actívalo en los ajustes del navegador.',
  NotFoundError: 'No encuentro ningún micrófono en este dispositivo.',
  unsupported: 'Este navegador no puede grabar audio. Prueba con Chrome, Edge o Safari actualizados.',
}

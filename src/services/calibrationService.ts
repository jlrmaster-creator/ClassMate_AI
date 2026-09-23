/**
 * Calibración de estimaciones (local-first, sin backend).
 *
 * Guarda en localStorage un factor por asignatura: estimado × factor ≈ tiempo
 * real. Se ajusta con cada tarea completada en la que el usuario reporta los
 * minutos reales (media móvil exponencial), y se usa para recalibrar el plan
 * de "Tengo X minutos", la alerta de sobrecarga y el repaso del día.
 */

const STORAGE_KEY = 'classmate-calibration'
type CalibrationMap = Record<string, number>

function read(): CalibrationMap {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as CalibrationMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(map: CalibrationMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Factor real/estimado de una asignatura (1 = la estimación es correcta). */
export function getCalibrationFactor(subject: string): number {
  const factor = read()[subject]
  return typeof factor === 'number' && Number.isFinite(factor) && factor > 0 ? factor : 1
}

/** Minutos calibrados de una tarea según el historial real de su asignatura. */
export function calibratedMinutes(subject: string, estimatedMinutes: number): number {
  return Math.max(5, Math.round(estimatedMinutes * getCalibrationFactor(subject)))
}

/**
 * Registra el tiempo real invertido en una tarea completada y recalibra el
 * factor de su asignatura (media móvil exponencial, acotada a 0.4x-2.5x).
 */
export function recordActualMinutes(subject: string, estimatedMinutes: number, actualMinutes: number): void {
  if (!subject || estimatedMinutes <= 0 || actualMinutes <= 0) return
  const map = read()
  const ratio = clamp(actualMinutes / estimatedMinutes, 0.4, 2.5)
  const previous = typeof map[subject] === 'number' ? map[subject] : 1
  map[subject] = Math.round((previous * 0.6 + ratio * 0.4) * 100) / 100
  write(map)
}
import { pedir, solicitar } from './http.js'

// ServicioDeReservas (:8083). Todo con JWT: el usuario sale del token.

/**
 * Una clave por intento logico: si la respuesta se pierde y se reintenta con
 * la misma clave, Reservas devuelve la misma reserva en vez de crear otra.
 * crypto.randomUUID solo existe en contextos seguros (localhost lo es); si se
 * abre el front por IP de la red local, se usa un respaldo.
 */
export function nuevaClaveIdempotencia() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/**
 * Diferencia entre el reloj del navegador y el del servidor, a partir del
 * header Date de la respuesta (resolucion de 1 s: se suma medio segundo).
 * El contador del hold la usa para no depender de la hora de la PC.
 */
function desfaseDesde(headers) {
  const fecha = Date.parse(headers.get('date') ?? '')
  return Number.isNaN(fecha) ? 0 : Date.now() - (fecha + 500)
}

/** POST /v1/reservas -> 201 con la reserva ACTIVA (hold) y el desfase de reloj. */
export async function crearReserva({ lockerId, compartimentoId, tamanoCompartimento, duracionHoras }, idempotencyKey) {
  const { datos, headers } = await solicitar('reservas', '/v1/reservas', {
    metodo: 'POST',
    cuerpo: { lockerId, compartimentoId, tamanoCompartimento, duracionHoras },
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  })
  return { reserva: datos, desfaseMs: desfaseDesde(headers) }
}

/** GET /v1/reservas/{id} (sin codigoRetiro) */
export async function obtenerReserva(id, opciones) {
  const { datos, headers } = await solicitar('reservas', `/v1/reservas/${id}`, opciones)
  return { reserva: datos, desfaseMs: desfaseDesde(headers) }
}

/** POST /v1/reservas/{id}/confirmacion -> la unica respuesta que trae codigoRetiro */
export function confirmarReserva(id) {
  return pedir('reservas', `/v1/reservas/${id}/confirmacion`, { metodo: 'POST' })
}

/** POST /v1/reservas/{id}/cancelacion */
export function cancelarReserva(id, motivo) {
  return pedir('reservas', `/v1/reservas/${id}/cancelacion`, { metodo: 'POST', cuerpo: motivo ? { motivo } : {} })
}

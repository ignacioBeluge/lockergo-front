import { pedir, solicitar } from './http.js'

// ServicioDeReservas (:8083). Todo con JWT: el usuario sale del token.

/**
 * POST /v1/reservas -> 201 con la reserva ACTIVA (hold). Devuelve tambien la
 * hora del servidor (header Date) para que el contador no dependa del reloj
 * del navegador.
 */
export async function crearReserva({ lockerId, compartimentoId, tamanoCompartimento, duracionHoras }, idempotencyKey) {
  const { datos, headers } = await solicitar('reservas', '/v1/reservas', {
    metodo: 'POST',
    cuerpo: { lockerId, compartimentoId, tamanoCompartimento, duracionHoras },
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  })
  return { reserva: datos, horaServidor: headers.get('date') }
}

/** GET /v1/reservas/{id} (sin codigoRetiro) */
export async function obtenerReserva(id, opciones) {
  const { datos, headers } = await solicitar('reservas', `/v1/reservas/${id}`, opciones)
  return { reserva: datos, horaServidor: headers.get('date') }
}

/** POST /v1/reservas/{id}/confirmacion -> la unica respuesta que trae codigoRetiro */
export function confirmarReserva(id) {
  return pedir('reservas', `/v1/reservas/${id}/confirmacion`, { metodo: 'POST' })
}

/** POST /v1/reservas/{id}/cancelacion */
export function cancelarReserva(id, motivo) {
  return pedir('reservas', `/v1/reservas/${id}/cancelacion`, { metodo: 'POST', cuerpo: motivo ? { motivo } : {} })
}

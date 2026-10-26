import { pedir, solicitar } from './http.js'

// ServicioDeOperaciones (:8087). Retiros, con JWT.

export const ESTADOS_TERMINALES = ['COMPLETADO', 'RECHAZADO', 'FALLIDO']

/**
 * POST /v1/retiros -> 201 (completado) o 202 (PENDIENTE_VALIDACION, hay que
 * consultar GET /v1/retiros/{id} hasta un estado terminal). 409 y 422 llegan
 * como ApiError.
 */
export async function solicitarRetiro({ reservaId, codigoRetiro, codigoEnvio }) {
  const { status, datos } = await solicitar('operaciones', '/v1/retiros', {
    metodo: 'POST',
    cuerpo: { reservaId, codigoRetiro, codigoEnvio },
  })
  return { status, retiro: datos }
}

/** GET /v1/retiros/{id} -> { id, reservaId, estado, intentos, ... } */
export function obtenerRetiro(id, opciones) {
  return pedir('operaciones', `/v1/retiros/${id}`, opciones)
}

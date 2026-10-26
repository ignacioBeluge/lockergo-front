import { pedir, query } from './http.js'

// ServicioDeLockers (:8082). Las consultas son abiertas; las altas y el
// cambio de estado exigen HTTP Basic con rol ADMINISTRADOR.

/** GET /v1/lockers -> { datos: [...], pagina: {...}, _links } */
export function listarLockers({ zona, pagina = 1, tamanio = 20, orden = 'id' } = {}, opciones) {
  return pedir('lockers', `/v1/lockers${query({ zona, pagina, tamanio, orden })}`, { auth: 'ninguna', ...opciones })
}

export function obtenerLocker(lockerId, opciones) {
  return pedir('lockers', `/v1/lockers/${lockerId}`, { auth: 'ninguna', ...opciones })
}

/** GET /v1/lockers/{id}/compartimentos -> [{ id, lockerId, tamano, estado }] */
export function listarCompartimentos(lockerId, opciones) {
  return pedir('lockers', `/v1/lockers/${lockerId}/compartimentos`, { auth: 'ninguna', ...opciones })
}

/** GET /v1/compartimentos/{id} -> { id, lockerId, tamano, estado } */
export function obtenerCompartimento(compartimentoId, opciones) {
  return pedir('lockers', `/v1/compartimentos/${compartimentoId}`, { auth: 'ninguna', ...opciones })
}

/** POST /v1/lockers (admin) */
export function crearLocker(basic, { nombre, direccion, zona }) {
  return pedir('lockers', '/v1/lockers', { metodo: 'POST', cuerpo: { nombre, direccion, zona }, auth: 'basic', basic })
}

/** POST /v1/lockers/{id}/compartimentos (admin) */
export function crearCompartimento(basic, lockerId, tamano) {
  return pedir('lockers', `/v1/lockers/${lockerId}/compartimentos`, {
    metodo: 'POST',
    cuerpo: { tamano },
    auth: 'basic',
    basic,
  })
}

/** PATCH /v1/compartimentos/{id} (admin) */
export function cambiarEstadoCompartimento(basic, compartimentoId, estado) {
  return pedir('lockers', `/v1/compartimentos/${compartimentoId}`, {
    metodo: 'PATCH',
    cuerpo: { estado },
    auth: 'basic',
    basic,
  })
}

/**
 * Lockers no tiene un endpoint para validar credenciales. Spring autentica
 * cualquier request que traiga el header Basic, asi que una consulta de
 * lectura alcanza: si la clave es incorrecta responde 401.
 */
export function verificarAdmin(basic) {
  return pedir('lockers', `/v1/lockers${query({ tamanio: 1 })}`, { auth: 'basic', basic })
}

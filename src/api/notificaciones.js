import { pedir, query } from './http.js'

// ServicioDeNotificaciones (:8085). Solo lectura; las crean los suscriptores
// de los topicos reserva-confirmada y retiro-confirmado.

/** GET /v1/notificaciones?reservaId=&tipoEvento= -> { datos: [{ id, canal, tipoEvento, mensaje, fechaEnvio }] } */
export function listarNotificacionesDeReserva(reservaId, tipoEvento, opciones) {
  return pedir('notificaciones', `/v1/notificaciones${query({ reservaId, tipoEvento })}`, {
    auth: 'ninguna',
    ...opciones,
  })
}

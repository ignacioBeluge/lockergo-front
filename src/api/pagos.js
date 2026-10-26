import { pedir, query } from './http.js'

// ServicioDePagos (:8084). Solo lectura; el pago lo crea la cola
// cobro-cargos-adicionales al confirmar la reserva.

/** GET /v1/pagos?reservaId= -> { datos: [{ id, reservaId, monto, concepto, fechaCobro }] } */
export function listarPagosDeReserva(reservaId, opciones) {
  return pedir('pagos', `/v1/pagos${query({ reservaId })}`, { auth: 'ninguna', ...opciones })
}

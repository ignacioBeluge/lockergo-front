// Regla de tarifa del backend, replicada para mostrar el "Precio estimado"
// antes de crear la reserva (Reservas no expone un endpoint para cotizar).
//
// Fuente: servicio-reservas/src/main/java/com/lockergo/reservas/strategy/
// TarifaPorTamanoYDuracion.java (precio por hora segun el tamano). Es el bean
// @Primary, asi que el descuento de TarifaConDescuentoPorVolumen no se aplica.
// Si el backend cambia la tarifa, hay que actualizar este archivo. Despues de
// crear la reserva se muestra siempre el precioEstimado que devuelve el backend.

export const TAMANOS = ['CHICO', 'MEDIANO', 'GRANDE']

export const PRECIO_POR_HORA = {
  CHICO: 100,
  MEDIANO: 150,
  GRANDE: 220,
}

export const HORAS_MIN = 1
export const HORAS_MAX = 168 // una semana; el backend solo exige > 0

export function calcularPrecioEstimado(tamano, horas) {
  const precioHora = PRECIO_POR_HORA[tamano]
  if (!precioHora || !Number.isInteger(horas) || horas < HORAS_MIN) return null
  return precioHora * horas
}

const formato = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

/** Acepta numeros o el string decimal que devuelve el backend ("450.00"). */
export function formatearPrecio(monto) {
  const numero = typeof monto === 'string' ? Number(monto) : monto
  return Number.isFinite(numero) ? formato.format(numero) : '—'
}

import { useSesion } from '../sesion/sesion.js'

export default function Transportista() {
  const sesion = useSesion()
  return (
    <section className="tarjeta ancho-medio vacio">
      <div className="resultado-icono" aria-hidden="true">
        🚚
      </div>
      <h1>Hola, {sesion.usuario?.nombre}</h1>
      <p>Tu cuenta es de transportista.</p>
      <p className="texto-suave">
        Las operaciones de depósito de paquetes llegan en una próxima versión de LockerGo. Por ahora, la reserva y el
        retiro están disponibles para cuentas de comprador.
      </p>
    </section>
  )
}

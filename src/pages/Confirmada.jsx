import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { listarNotificacionesDeReserva } from '../api/notificaciones.js'
import { listarPagosDeReserva } from '../api/pagos.js'
import { obtenerReserva } from '../api/reservas.js'
import { Alerta, Cargando, ErrorCarga, Estado } from '../components/ui.jsx'
import { formatearPrecio } from '../config/tarifas.js'
import { useCarga } from '../hooks/useCarga.js'
import { leerUltimaReserva } from '../sesion/sesion.js'

const INTERVALO_MS = 2000
const MAX_CONSULTAS = 15 // ~30 s
const CANALES = 3 // EMAIL, PUSH y SMS

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'medium' })

/**
 * Las bases son H2 en memoria y Reservas numera desde 1 en cada arranque: un
 * reservaId puede repetir el de una reserva anterior. Se descartan pagos y
 * notificaciones anteriores a la confirmacion (con 5 s de margen de reloj).
 */
function posterioresA(items, campoFecha, desde) {
  if (!desde) return items
  const limite = Date.parse(desde) - 5000
  return items.filter((item) => Date.parse(item[campoFecha]) >= limite)
}

/**
 * Pago y notificaciones llegan por mensajeria (cola y topico), unos segundos
 * despues de confirmar. Se consulta cada 2 s hasta tener el pago y las tres
 * notificaciones, o hasta agotar las consultas.
 */
function useEfectosDeConfirmacion(reservaId, horaResolucion) {
  const [estado, setEstado] = useState({ pagos: [], notificaciones: [], consultas: 0, terminado: false, error: null })

  useEffect(() => {
    if (!reservaId) return undefined
    const control = new AbortController()
    let temporizador = null
    let consultas = 0

    async function consultar() {
      consultas++
      try {
        const [pagos, notificaciones] = await Promise.all([
          listarPagosDeReserva(reservaId, { signal: control.signal }),
          listarNotificacionesDeReserva(reservaId, 'RESERVA_CONFIRMADA', { signal: control.signal }),
        ])
        const p = posterioresA(pagos.datos, 'fechaCobro', horaResolucion)
        const n = posterioresA(notificaciones.datos, 'fechaEnvio', horaResolucion)
        const completo = p.length > 0 && n.length >= CANALES
        const terminado = completo || consultas >= MAX_CONSULTAS
        setEstado({ pagos: p, notificaciones: n, consultas, terminado, error: null })
        if (!terminado) temporizador = setTimeout(consultar, INTERVALO_MS)
      } catch (error) {
        if (error.name === 'AbortError') return
        const terminado = consultas >= MAX_CONSULTAS
        setEstado((anterior) => ({ ...anterior, consultas, terminado, error }))
        if (!terminado) temporizador = setTimeout(consultar, INTERVALO_MS)
      }
    }

    consultar()
    return () => {
      control.abort()
      clearTimeout(temporizador)
    }
  }, [reservaId, horaResolucion])

  return estado
}

function CodigoRetiro({ codigo, reservaId }) {
  if (!codigo) {
    return (
      <Alerta tipo="aviso" titulo="Código no disponible">
        Reservas muestra el código de retiro una sola vez, al confirmar, y no quedó guardado en esta pestaña. Si lo
        anotaste, podés usarlo igual en Retirar paquete.
      </Alerta>
    )
  }
  return (
    <div className="codigo-retiro">
      <p className="texto-suave">Código de retiro</p>
      <div className="codigo-texto" aria-label={`Código de retiro: ${codigo.split('').join(' ')}`}>
        {codigo}
      </div>
      <div className="qr">
        <QRCodeSVG value={codigo} size={200} level="M" marginSize={0} title={`Código QR del retiro de la reserva ${reservaId}`} />
      </div>
      <p className="texto-suave">Mostralo en el locker para retirar el paquete. Solo se muestra esta vez.</p>
    </div>
  )
}

export default function Confirmada() {
  const { id } = useParams()
  const location = useLocation()
  const recibida = location.state?.reserva?.id === Number(id) ? location.state.reserva : null
  const guardada = leerUltimaReserva()
  const codigo = recibida?.codigoRetiro ?? (guardada?.reservaId === Number(id) ? guardada.codigoRetiro : null)

  const cargar = useCallback((signal) => obtenerReserva(id, { signal }).then((r) => r.reserva), [id])
  const { cargando, datos: reserva, error, recargar } = useCarga(cargar)

  const horaResolucion = reserva?.estado === 'CONFIRMADA' ? reserva.horaResolucion : null
  const efectos = useEfectosDeConfirmacion(horaResolucion ? reserva.id : null, horaResolucion)

  if (cargando && !reserva) return <Cargando texto="Cargando la reserva…" />
  if (error) return <ErrorCarga error={error} onReintentar={recargar} titulo="No se pudo cargar la reserva" />

  if (reserva.estado !== 'CONFIRMADA') {
    return (
      <section className="tarjeta ancho-medio">
        <h1>Esta reserva no está confirmada</h1>
        <p>
          Estado actual: <Estado valor={reserva.estado} />
        </p>
        <Link className="boton boton-primario" to={`/reservas/${reserva.id}`}>
          Ver la reserva
        </Link>
      </section>
    )
  }

  const pago = efectos.pagos[0]
  const esperando = !efectos.terminado

  return (
    <>
      <div className="pagina-encabezado">
        <div>
          <h1>¡Reserva confirmada!</h1>
          <p>
            Reserva #{reserva.id} · compartimento #{reserva.compartimentoId} ({reserva.tamanoCompartimento}) ·{' '}
            {reserva.duracionHoras} h
          </p>
        </div>
        <Link className="boton boton-primario" to="/retiro">
          Retirar paquete
        </Link>
      </div>

      <div className="dos-columnas">
        <section className="tarjeta">
          <CodigoRetiro codigo={codigo} reservaId={reserva.id} />
        </section>

        <div>
          <section className="tarjeta" aria-live="polite">
            <div className="tarjeta-encabezado">
              <h2>Pago</h2>
              {pago ? <Estado valor="COMPLETADO" /> : esperando ? <span className="insignia insignia-info">Procesando</span> : null}
            </div>
            {pago ? (
              <dl className="datos">
                <dt>Monto</dt>
                <dd>{formatearPrecio(pago.monto)}</dd>
                <dt>Concepto</dt>
                <dd>{pago.concepto}</dd>
                <dt>Fecha</dt>
                <dd>{fecha.format(new Date(pago.fechaCobro))}</dd>
                <dt>Id de pago</dt>
                <dd>#{pago.id}</dd>
              </dl>
            ) : esperando ? (
              <Cargando texto="Esperando el cobro de Pagos (llega por la cola cobro-cargos-adicionales)…" />
            ) : (
              <Alerta tipo="aviso" titulo="Todavía no hay pago registrado">
                {efectos.error ? efectos.error.message : '¿Están levantados Pagos y ActiveMQ?'}
              </Alerta>
            )}
          </section>

          <section className="tarjeta" aria-live="polite">
            <div className="tarjeta-encabezado">
              <h2>Notificaciones</h2>
              <span className="insignia insignia-neutro">
                {efectos.notificaciones.length} de {CANALES}
              </span>
            </div>
            {efectos.notificaciones.length > 0 && (
              <ul className="lista">
                {efectos.notificaciones.map((n) => (
                  <li key={n.id}>
                    <div className="lista-encabezado">
                      <strong>{n.canal}</strong>
                      <small className="texto-suave">{fecha.format(new Date(n.fechaEnvio))}</small>
                    </div>
                    <span>{n.mensaje}</span>
                  </li>
                ))}
              </ul>
            )}
            {esperando && efectos.notificaciones.length < CANALES && (
              <Cargando texto="Esperando notificaciones (tópico reserva-confirmada)…" />
            )}
            {!esperando && efectos.notificaciones.length === 0 && (
              <Alerta tipo="aviso" titulo="No llegaron notificaciones">
                {efectos.error ? efectos.error.message : '¿Están levantados Notificaciones y ActiveMQ?'}
              </Alerta>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

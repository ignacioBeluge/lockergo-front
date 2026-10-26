import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { obtenerCompartimento, obtenerLocker } from '../api/lockers.js'
import { cancelarReserva, confirmarReserva, obtenerReserva } from '../api/reservas.js'
import { Alerta, Cargando, ErrorCarga, ErrorEnvio, Estado } from '../components/ui.jsx'
import { formatearPrecio } from '../config/tarifas.js'
import { useCarga } from '../hooks/useCarga.js'
import { formatearMinutos, useCuentaRegresiva } from '../hooks/useCuentaRegresiva.js'
import { guardarUltimaReserva } from '../sesion/sesion.js'

const UN_MINUTO = 60_000

/**
 * Contador del hold. El tiempo restante sale de horaExpiracionHold (hora del
 * servidor) corregida por el desfase de reloj; el anillo muestra la fraccion
 * que queda de la duracion total del hold.
 */
function Contador({ restanteMs, totalMs }) {
  const expirado = restanteMs === 0
  const clase = expirado ? 'contador-expirado' : restanteMs <= UN_MINUTO ? 'contador-urgente' : ''
  const progreso = totalMs > 0 ? restanteMs / totalMs : 0
  return (
    <div className={`contador ${clase}`} style={{ '--progreso': progreso }}>
      <div className="contador-texto" role="timer" aria-label={`Tiempo restante del hold: ${formatearMinutos(restanteMs)}`}>
        <span className="contador-tiempo">{formatearMinutos(restanteMs)}</span>
        <span className="contador-etiqueta">{expirado ? 'hold expirado' : 'para confirmar'}</span>
      </div>
    </div>
  )
}

function DatosReserva({ reserva, locker }) {
  return (
    <dl className="datos">
      <dt>Reserva</dt>
      <dd>#{reserva.id}</dd>
      {locker && (
        <>
          <dt>Locker</dt>
          <dd>
            {locker.nombre} · {locker.zona}
          </dd>
        </>
      )}
      <dt>Compartimento</dt>
      <dd>
        #{reserva.compartimentoId} · {reserva.tamanoCompartimento}
      </dd>
      <dt>Duración</dt>
      <dd>{reserva.duracionHoras} h</dd>
      <dt>Precio estimado</dt>
      <dd>{formatearPrecio(reserva.precioEstimado)}</dd>
      <dt>Estado</dt>
      <dd>
        <Estado valor={reserva.estado} />
      </dd>
    </dl>
  )
}

/** El locker no viene en la reserva: si no llego por la navegacion, se busca por el compartimento. */
function useLockerDeReserva(compartimentoId, lockerConocido) {
  const cargar = useCallback(
    async (signal) => {
      if (lockerConocido || !compartimentoId) return lockerConocido ?? null
      const compartimento = await obtenerCompartimento(compartimentoId, { signal })
      return obtenerLocker(compartimento.lockerId, { signal })
    },
    [compartimentoId, lockerConocido],
  )
  return useCarga(cargar).datos
}

export default function Hold() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  // Siempre se consulta a Reservas (el state de la navegacion sobrevive a una
  // recarga y podria estar viejo); de la navegacion solo se toma el locker.
  const lockerRecibido = location.state?.reserva?.id === Number(id) ? location.state.locker : null
  const cargar = useCallback((signal) => obtenerReserva(id, { signal }), [id])
  const { cargando, datos, error, recargar } = useCarga(cargar)
  // Reserva devuelta por una accion (cancelar, o el estado real tras un 409).
  const [actualizada, setActualizada] = useState(null)
  const [accion, setAccion] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  const reserva = actualizada ?? datos?.reserva
  const activa = reserva?.estado === 'ACTIVA'
  const expiraEn = activa ? Date.parse(reserva.horaExpiracionHold) : null
  const restanteMs = useCuentaRegresiva(expiraEn, datos?.desfaseMs ?? 0)
  const locker = useLockerDeReserva(reserva?.compartimentoId, lockerRecibido)

  if (cargando && !datos) return <Cargando texto="Cargando la reserva…" />
  if (error) return <ErrorCarga error={error} onReintentar={recargar} titulo="No se pudo cargar la reserva" />

  const expirado = activa && restanteMs === 0
  const totalMs = activa ? expiraEn - Date.parse(reserva.horaCreacion) : 0

  async function confirmar() {
    setAccion('confirmar')
    setErrorAccion(null)
    try {
      const confirmada = await confirmarReserva(reserva.id)
      guardarUltimaReserva({
        reservaId: confirmada.id,
        codigoRetiro: confirmada.codigoRetiro,
        horaResolucion: confirmada.horaResolucion,
      })
      navigate(`/reservas/${confirmada.id}/confirmada`, { state: { reserva: confirmada, locker } })
    } catch (e) {
      setErrorAccion(e)
      setAccion(null)
      // 409: la reserva ya no esta activa (por ejemplo, Reservas la expiro).
      if (e.status === 409) {
        obtenerReserva(reserva.id).then(({ reserva: real }) => setActualizada(real), () => {})
      }
    }
  }

  async function cancelar() {
    setAccion('cancelar')
    setErrorAccion(null)
    try {
      setActualizada(await cancelarReserva(reserva.id, 'Cancelada por el comprador desde la web'))
    } catch (e) {
      setErrorAccion(e)
    } finally {
      setAccion(null)
    }
  }

  return (
    <div className="ancho-medio">
      <Link className="volver" to="/lockers">
        ← Volver a lockers
      </Link>
      <section className="tarjeta hold">
        {activa ? (
          <>
            <h1>{expirado ? 'El hold expiró' : 'Compartimento retenido'}</h1>
            <p className="texto-suave">
              {expirado
                ? 'Pasó el tiempo para confirmar y el compartimento se libera.'
                : 'Confirmá la reserva antes de que termine el contador.'}
            </p>
            <Contador restanteMs={restanteMs} totalMs={totalMs} />
            {expirado && (
              <Alerta tipo="error" titulo="Hold expirado">
                Ya no se puede confirmar esta reserva. Buscá un locker y reservá de nuevo.
              </Alerta>
            )}
            {!expirado && restanteMs <= UN_MINUTO && (
              <Alerta tipo="aviso">Queda menos de un minuto para confirmar.</Alerta>
            )}
            <ErrorEnvio error={errorAccion} />
            <div className="acciones">
              <button
                type="button"
                className="boton boton-primario boton-grande"
                onClick={confirmar}
                disabled={expirado || accion !== null}
              >
                {accion === 'confirmar' ? 'Confirmando…' : 'Confirmar reserva'}
              </button>
              {expirado ? (
                <Link className="boton boton-secundario boton-grande" to="/lockers">
                  Buscar otro locker
                </Link>
              ) : (
                <button
                  type="button"
                  className="boton boton-peligro boton-grande"
                  onClick={cancelar}
                  disabled={accion !== null}
                >
                  {accion === 'cancelar' ? 'Cancelando…' : 'Cancelar'}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h1>
              {reserva.estado === 'CANCELADA'
                ? 'Reserva cancelada'
                : reserva.estado === 'EXPIRADA'
                  ? 'El hold expiró'
                  : 'Reserva confirmada'}
            </h1>
            <p className="texto-suave">
              {reserva.estado === 'CONFIRMADA'
                ? 'Esta reserva ya fue confirmada.'
                : 'El compartimento quedó libre. Podés reservar de nuevo.'}
            </p>
            <div className="acciones">
              {reserva.estado === 'CONFIRMADA' ? (
                <Link className="boton boton-primario" to={`/reservas/${reserva.id}/confirmada`}>
                  Ver código de retiro
                </Link>
              ) : (
                <Link className="boton boton-primario" to="/lockers">
                  Buscar lockers
                </Link>
              )}
            </div>
          </>
        )}
      </section>
      <section className="tarjeta">
        <h2>Detalle</h2>
        {/* Reservas expira los holds con un job cada 30 s: en 0 se muestra EXPIRADA aunque todavia figure ACTIVA. */}
        <DatosReserva reserva={expirado ? { ...reserva, estado: 'EXPIRADA' } : reserva} locker={locker} />
      </section>
    </div>
  )
}

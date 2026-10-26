import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ESTADOS_TERMINALES, obtenerRetiro, solicitarRetiro } from '../api/operaciones.js'
import { Alerta, Campo, ErrorEnvio, Estado } from '../components/ui.jsx'
import { validarRetiro } from '../config/validaciones.js'
import { leerUltimaReserva } from '../sesion/sesion.js'

const INTERVALO_MS = 3000

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'medium' })

function datosIniciales() {
  const ultima = leerUltimaReserva()
  return {
    reservaId: ultima?.reservaId ? String(ultima.reservaId) : '',
    codigoRetiro: ultima?.codigoRetiro ?? '',
    codigoEnvio: ultima?.reservaId ? `ENV-${ultima.reservaId}` : '',
  }
}

/** Mensaje claro para los rechazos esperables de POST /v1/retiros. */
function errorDeRetiro(error) {
  if (error.status === 409) return { titulo: 'Este retiro ya no se puede hacer', detalle: error.detalle }
  if (error.status === 422) return { titulo: 'Código de retiro inválido', detalle: error.detalle }
  return error
}

/**
 * 202: la validacion sigue por cola en Operaciones. Se consulta
 * GET /v1/retiros/{id} cada 3 s hasta un estado terminal.
 */
function useSeguimientoRetiro(retiroPendiente) {
  const [seguimiento, setSeguimiento] = useState(null)

  useEffect(() => {
    if (!retiroPendiente) return undefined
    const control = new AbortController()
    let temporizador = null
    let consultas = 0

    async function consultar() {
      consultas++
      try {
        const retiro = await obtenerRetiro(retiroPendiente.id, { signal: control.signal })
        setSeguimiento({ retiroId: retiroPendiente.id, retiro, consultas, error: null })
        if (!ESTADOS_TERMINALES.includes(retiro.estado)) temporizador = setTimeout(consultar, INTERVALO_MS)
      } catch (error) {
        if (error.name === 'AbortError') return
        // Un error de red no corta el seguimiento: se muestra y se reintenta.
        setSeguimiento((anterior) => ({ retiroId: retiroPendiente.id, retiro: anterior?.retiro ?? retiroPendiente, consultas, error }))
        if (error.status !== 401 && error.status !== 404) temporizador = setTimeout(consultar, INTERVALO_MS)
      }
    }

    temporizador = setTimeout(consultar, INTERVALO_MS)
    return () => {
      control.abort()
      clearTimeout(temporizador)
    }
  }, [retiroPendiente])

  // Solo vale el seguimiento del retiro pendiente actual.
  return seguimiento?.retiroId === retiroPendiente?.id ? seguimiento : null
}

function DetalleRetiro({ retiro }) {
  return (
    <dl className="datos">
      <dt>Retiro</dt>
      <dd>#{retiro.id}</dd>
      <dt>Reserva</dt>
      <dd>#{retiro.reservaId}</dd>
      {retiro.compartimentoId && (
        <>
          <dt>Compartimento</dt>
          <dd>#{retiro.compartimentoId}</dd>
        </>
      )}
      <dt>Estado</dt>
      <dd>
        <Estado valor={retiro.estado} />
      </dd>
      <dt>Intentos de validación</dt>
      <dd>{retiro.intentos}</dd>
      {retiro.fechaRetiro && (
        <>
          <dt>Retirado</dt>
          <dd>{fecha.format(new Date(retiro.fechaRetiro))}</dd>
        </>
      )}
    </dl>
  )
}

function Resultado({ retiro, consultas, errorSeguimiento, onNuevo }) {
  if (retiro.estado === 'PENDIENTE_VALIDACION') {
    return (
      <section className="tarjeta validando" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <h2>Validando…</h2>
        <p className="texto-suave">
          Reservas tardó en responder y Operaciones sigue validando el código por cola. Esta pantalla consulta el estado
          cada 3 segundos.
        </p>
        <p>
          <strong>Intentos de validación: {retiro.intentos}</strong>
          <br />
          <span className="texto-suave">Consultas al estado: {consultas}</span>
        </p>
        {errorSeguimiento && (
          <Alerta tipo="aviso" titulo="No se pudo consultar el estado">
            {errorSeguimiento.message}
          </Alerta>
        )}
        <DetalleRetiro retiro={retiro} />
      </section>
    )
  }

  const exito = retiro.estado === 'COMPLETADO'
  return (
    <section className="tarjeta" aria-live="polite">
      <div className="vacio resultado-encabezado">
        <div className="resultado-icono" aria-hidden="true">
          {exito ? '✅' : '⛔'}
        </div>
        <h2>
          {exito ? '¡Retiro completado!' : retiro.estado === 'RECHAZADO' ? 'Retiro rechazado' : 'El retiro falló'}
        </h2>
        <p>
          {exito
            ? `El compartimento #${retiro.compartimentoId} se abrió. Ya podés retirar tu paquete.`
            : retiro.estado === 'RECHAZADO'
              ? 'El código no es válido para esa reserva.'
              : 'Se agotaron los reintentos sin respuesta de Reservas. Podés volver a intentarlo.'}
        </p>
      </div>
      <DetalleRetiro retiro={retiro} />
      <div className="acciones">
        <button type="button" className="boton boton-secundario" onClick={onNuevo}>
          {retiro.estado === 'FALLIDO' ? 'Volver a intentar' : 'Hacer otro retiro'}
        </button>
        <Link className="boton boton-fantasma" to="/lockers">
          Ir a lockers
        </Link>
      </div>
    </section>
  )
}

export default function Retiro() {
  const [datos, setDatos] = useState(datosIniciales)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [respuesta, setRespuesta] = useState(null) // { status, retiro }

  const pendiente = respuesta?.status === 202 ? respuesta.retiro : null
  const seguimiento = useSeguimientoRetiro(pendiente)
  const retiroActual = seguimiento?.retiro ?? respuesta?.retiro
  const consultas = seguimiento?.consultas ?? 0

  async function enviar(evento) {
    evento.preventDefault()
    const locales = validarRetiro(datos)
    setErrores(locales)
    if (Object.keys(locales).length) return
    setEnviando(true)
    setError(null)
    setRespuesta(null)
    try {
      setRespuesta(
        await solicitarRetiro({
          reservaId: Number(datos.reservaId),
          codigoRetiro: datos.codigoRetiro.trim().toUpperCase(),
          codigoEnvio: datos.codigoEnvio.trim(),
        }),
      )
    } catch (e) {
      setErrores(e.errores ?? {})
      setError(errorDeRetiro(e))
    } finally {
      setEnviando(false)
    }
  }

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value })
  const enCurso = enviando || retiroActual?.estado === 'PENDIENTE_VALIDACION'

  return (
    <>
      <div className="pagina-encabezado">
        <div>
          <h1>Retirar paquete</h1>
          <p>Ingresá el número de reserva y el código de retiro que recibiste al confirmar.</p>
        </div>
      </div>

      <div className="dos-columnas">
        <section className="tarjeta">
          <ErrorEnvio error={error} />
          <form className="formulario" onSubmit={enviar} noValidate>
            <Campo
              id="retiro-reserva"
              etiqueta="Número de reserva"
              inputMode="numeric"
              value={datos.reservaId}
              onChange={cambiar('reservaId')}
              error={errores.reservaId}
              disabled={enCurso}
            />
            <Campo
              id="retiro-codigo"
              etiqueta="Código de retiro"
              className="entrada-codigo"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              maxLength={6}
              value={datos.codigoRetiro}
              onChange={cambiar('codigoRetiro')}
              error={errores.codigoRetiro}
              disabled={enCurso}
              ayuda="6 letras o números."
            />
            <Campo
              id="retiro-envio"
              etiqueta="Código de envío"
              autoComplete="off"
              value={datos.codigoEnvio}
              onChange={cambiar('codigoEnvio')}
              error={errores.codigoEnvio}
              disabled={enCurso}
              ayuda="Valor de demo: el backend todavía lo pide en el pedido de retiro (simplificación temporal). Cualquier código sirve; se completa como ENV-<reserva>."
            />
            <button className="boton boton-primario boton-grande" disabled={enCurso}>
              {enviando ? 'Enviando…' : 'Retirar'}
            </button>
          </form>
        </section>

        <div>
          {retiroActual ? (
            <Resultado
              retiro={retiroActual}
              consultas={consultas}
              errorSeguimiento={seguimiento?.error}
              onNuevo={() => setRespuesta(null)}
            />
          ) : (
            <section className="tarjeta vacio">
              <p>El resultado del retiro aparece acá.</p>
              <p className="texto-suave">
                Si Reservas está lenta, el retiro queda “Validando…” y se actualiza solo hasta completarse.
              </p>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

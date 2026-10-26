import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/http.js'
import { listarCompartimentos, obtenerLocker } from '../api/lockers.js'
import { crearReserva, nuevaClaveIdempotencia } from '../api/reservas.js'
import { Alerta, Campo, Cargando, ErrorCarga, ErrorEnvio } from '../components/ui.jsx'
import { libresDeTamano, resumirPorTamano } from '../config/disponibilidad.js'
import {
  HORAS_MAX,
  HORAS_MIN,
  PRECIO_POR_HORA,
  TAMANOS,
  calcularPrecioEstimado,
  formatearPrecio,
} from '../config/tarifas.js'
import { useCarga } from '../hooks/useCarga.js'

const SIN_LIBRES = 'No hay compartimentos libres de ese tamaño en este locker'

/**
 * Crea el hold probando los compartimentos DISPONIBLE del tamano en orden.
 * Un 409 significa que ese compartimento ya tiene un hold (Lockers no lo
 * refleja): se prueba el siguiente. Tope: tantos intentos como compartimentos
 * libres habia. Cualquier otro error corta.
 */
async function reservarAlguno({ lockerId, candidatos, tamano, horas, alIntentar }) {
  for (const [indice, compartimento] of candidatos.entries()) {
    alIntentar({ compartimentoId: compartimento.id, intento: indice + 1, de: candidatos.length })
    try {
      return await crearReserva(
        { lockerId, compartimentoId: compartimento.id, tamanoCompartimento: tamano, duracionHoras: horas },
        nuevaClaveIdempotencia(),
      )
    } catch (error) {
      if (error.status !== 409) throw error
    }
  }
  throw new ApiError({ status: 409, titulo: 'Sin disponibilidad', detalle: SIN_LIBRES })
}

export default function Reservar() {
  const { lockerId } = useParams()
  const [parametros] = useSearchParams()
  const navigate = useNavigate()

  const cargar = useCallback(
    async (signal) => {
      const [locker, compartimentos] = await Promise.all([
        obtenerLocker(lockerId, { signal }),
        listarCompartimentos(lockerId, { signal }),
      ])
      return { locker, compartimentos }
    },
    [lockerId],
  )
  const { cargando, datos, error, recargar } = useCarga(cargar)

  const [tamano, setTamano] = useState(TAMANOS.includes(parametros.get('tamano')) ? parametros.get('tamano') : 'CHICO')
  const [horasTexto, setHorasTexto] = useState('3')
  const [errorHoras, setErrorHoras] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState(null)
  const [errorEnvio, setErrorEnvio] = useState(null)

  if (cargando && !datos) return <Cargando texto="Cargando locker…" />
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />

  const { locker, compartimentos } = datos
  const resumen = resumirPorTamano(compartimentos)
  const horas = Number(horasTexto)
  const horasValidas = Number.isInteger(horas) && horas >= HORAS_MIN && horas <= HORAS_MAX
  const precio = horasValidas ? calcularPrecioEstimado(tamano, horas) : null
  const libres = resumen[tamano].libres

  async function enviar(evento) {
    evento.preventDefault()
    if (!horasValidas) {
      setErrorHoras(`Ingresá un número entero de horas entre ${HORAS_MIN} y ${HORAS_MAX}.`)
      return
    }
    setErrorHoras(null)
    setErrorEnvio(null)
    const candidatos = libresDeTamano(compartimentos, tamano)
    if (candidatos.length === 0) {
      setErrorEnvio({ titulo: 'Sin disponibilidad', detalle: SIN_LIBRES })
      return
    }
    setEnviando(true)
    try {
      const { reserva, desfaseMs } = await reservarAlguno({
        lockerId: locker.id,
        candidatos,
        tamano,
        horas,
        alIntentar: setProgreso,
      })
      navigate(`/reservas/${reserva.id}`, { state: { reserva, desfaseMs, locker } })
    } catch (e) {
      setErrorEnvio(e)
      setEnviando(false)
      setProgreso(null)
      // Los datos de disponibilidad pueden haber cambiado: se refrescan.
      recargar()
    }
  }

  return (
    <div className="ancho-medio">
      <Link className="volver" to="/lockers">
        ← Volver a lockers
      </Link>
      <section className="tarjeta">
        <div className="tarjeta-encabezado">
          <div>
            <h1>Reservar en {locker.nombre}</h1>
            <p className="locker-direccion">
              {locker.direccion} · {locker.zona}
            </p>
          </div>
        </div>

        <form className="formulario" onSubmit={enviar} noValidate>
          <fieldset className="opciones-tamano">
            <legend>Tamaño del compartimento</legend>
            {TAMANOS.map((t) => (
              <label key={t} className="opcion-tamano">
                <input
                  type="radio"
                  name="tamano"
                  value={t}
                  checked={tamano === t}
                  disabled={resumen[t].libres === 0 || enviando}
                  onChange={() => setTamano(t)}
                />
                <strong>{t}</strong>
                <small>{formatearPrecio(PRECIO_POR_HORA[t])}/h</small>
                <small>
                  {resumen[t].libres} de {resumen[t].total} libres
                </small>
              </label>
            ))}
          </fieldset>

          <Campo
            id="reserva-horas"
            etiqueta="Horas de almacenamiento"
            type="number"
            inputMode="numeric"
            min={HORAS_MIN}
            max={HORAS_MAX}
            step="1"
            value={horasTexto}
            disabled={enviando}
            onChange={(e) => setHorasTexto(e.target.value)}
            error={errorHoras}
            ayuda={`Entre ${HORAS_MIN} y ${HORAS_MAX} horas.`}
          />

          <div className="precio" aria-live="polite">
            <span>
              <strong>Precio estimado</strong>
              <br />
              <small className="texto-suave">
                {horasValidas ? `${horas} h × ${formatearPrecio(PRECIO_POR_HORA[tamano])}` : 'Completá las horas'}
              </small>
            </span>
            <span className="precio-valor">{precio === null ? '—' : formatearPrecio(precio)}</span>
          </div>

          {libres === 0 && <Alerta tipo="aviso">{SIN_LIBRES}.</Alerta>}
          <ErrorEnvio error={errorEnvio} />
          {progreso && (
            <Cargando
              texto={`Reservando el compartimento #${progreso.compartimentoId} (intento ${progreso.intento} de ${progreso.de})…`}
            />
          )}

          <button className="boton boton-primario boton-grande" disabled={enviando || libres === 0}>
            {enviando ? 'Reservando…' : 'Reservar'}
          </button>
          <p className="texto-suave nota-pie">
            Al reservar, el compartimento queda retenido unos minutos para que confirmes.
          </p>
        </form>
      </section>
    </div>
  )
}

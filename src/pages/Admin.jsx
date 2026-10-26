import { useCallback, useState } from 'react'
import {
  cambiarEstadoCompartimento,
  crearCompartimento,
  crearLocker,
  listarCompartimentos,
  listarLockers,
  verificarAdmin,
} from '../api/lockers.js'
import { Alerta, Campo, Cargando, ErrorCarga, ErrorEnvio, Estado } from '../components/ui.jsx'
import { LOCKERS_DEMO } from '../config/datosDemo.js'
import { TAMANOS } from '../config/tarifas.js'
import { useCarga } from '../hooks/useCarga.js'
import { guardarCredencialesAdmin, olvidarCredencialesAdmin, useCredencialesAdmin } from '../sesion/admin.js'

const ESTADOS_COMPARTIMENTO = ['DISPONIBLE', 'RESERVADO', 'OCUPADO']

/** Un 401 de Lockers significa que las credenciales ya no sirven: se olvidan. */
function siNoAutorizado(error) {
  if (error?.status === 401) olvidarCredencialesAdmin()
}

function IngresoAdmin() {
  const [usuario, setUsuario] = useState('admin')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  async function enviar(evento) {
    evento.preventDefault()
    if (!usuario.trim() || !password) {
      setError({ titulo: 'Faltan datos', detalle: 'Ingresá usuario y contraseña.' })
      return
    }
    setEnviando(true)
    setError(null)
    const basic = { usuario: usuario.trim(), password }
    try {
      await verificarAdmin(basic)
      guardarCredencialesAdmin(basic)
    } catch (e) {
      setError(
        e.status === 401
          ? { titulo: 'Credenciales inválidas', detalle: 'Lockers rechazó el usuario o la contraseña (HTTP Basic).' }
          : e,
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="tarjeta centrado">
      <h1>Administración</h1>
      <p className="texto-suave">
        Las altas y el cambio de estado de Lockers usan HTTP Basic con rol ADMINISTRADOR. Las credenciales quedan solo en
        memoria: se pierden al recargar la página.
      </p>
      <ErrorEnvio error={error} />
      <form className="formulario" onSubmit={enviar} noValidate>
        <Campo
          id="admin-usuario"
          etiqueta="Usuario"
          autoComplete="username"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <Campo
          id="admin-password"
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="boton boton-primario" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Ingresar como administrador'}
        </button>
      </form>
    </section>
  )
}

function DatosDemo({ basic, lockersExistentes, onCargado }) {
  const [registro, setRegistro] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    const lineas = []
    const anotar = (linea) => {
      lineas.push(linea)
      setRegistro([...lineas])
    }
    try {
      const nombres = new Set(lockersExistentes.map((l) => l.nombre))
      for (const demo of LOCKERS_DEMO) {
        if (nombres.has(demo.nombre)) {
          anotar(`· ${demo.nombre}: ya existe, se omite`)
          continue
        }
        const locker = await crearLocker(basic, demo)
        let total = 0
        for (const [tamano, cantidad] of Object.entries(demo.compartimentos)) {
          for (let i = 0; i < cantidad; i++) {
            await crearCompartimento(basic, locker.id, tamano)
            total++
          }
        }
        anotar(`✓ ${demo.nombre} (#${locker.id}, zona ${demo.zona}): ${total} compartimentos`)
      }
      anotar('Listo.')
      onCargado()
    } catch (e) {
      siNoAutorizado(e)
      setError(e)
      onCargado()
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Datos de demo</h2>
      <p className="texto-suave">
        Crea {LOCKERS_DEMO.length} lockers en zonas distintas (
        {LOCKERS_DEMO.map((l) => l.zona).join(', ')}) con compartimentos chicos, medianos y grandes. Los que ya existen
        con el mismo nombre se omiten.
      </p>
      <ErrorEnvio error={error} />
      <button type="button" className="boton boton-primario" onClick={cargar} disabled={cargando}>
        {cargando ? 'Cargando…' : 'Cargar datos de demo'}
      </button>
      {registro.length > 0 && (
        <pre className="registro-demo" aria-live="polite">
          {registro.join('\n')}
        </pre>
      )}
    </section>
  )
}

function AltaLocker({ basic, onCreado }) {
  const vacio = { nombre: '', direccion: '', zona: '' }
  const [datos, setDatos] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const faltantes = {}
    for (const campo of Object.keys(vacio)) if (!datos[campo].trim()) faltantes[campo] = 'Es obligatorio.'
    setErrores(faltantes)
    setExito(null)
    if (Object.keys(faltantes).length) return
    setEnviando(true)
    setError(null)
    try {
      const locker = await crearLocker(basic, {
        nombre: datos.nombre.trim(),
        direccion: datos.direccion.trim(),
        zona: datos.zona.trim(),
      })
      setExito(`Locker #${locker.id} creado.`)
      setDatos(vacio)
      onCreado(locker.id)
    } catch (e) {
      siNoAutorizado(e)
      setErrores(e.errores ?? {})
      setError(e)
    } finally {
      setEnviando(false)
    }
  }

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value })

  return (
    <section className="tarjeta">
      <h2>Alta de locker</h2>
      <ErrorEnvio error={error} />
      {exito && <Alerta tipo="exito">{exito}</Alerta>}
      <form className="formulario" onSubmit={enviar} noValidate>
        <Campo id="locker-nombre" etiqueta="Nombre" value={datos.nombre} onChange={cambiar('nombre')} error={errores.nombre} />
        <Campo
          id="locker-direccion"
          etiqueta="Dirección"
          value={datos.direccion}
          onChange={cambiar('direccion')}
          error={errores.direccion}
        />
        <Campo
          id="locker-zona"
          etiqueta="Zona"
          value={datos.zona}
          onChange={cambiar('zona')}
          error={errores.zona}
          ayuda="El filtro de búsqueda compara la zona exacta."
        />
        <button className="boton boton-primario" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear locker'}
        </button>
      </form>
    </section>
  )
}

function AltaCompartimento({ basic, lockers, lockerId, onCreado }) {
  const [tamano, setTamano] = useState('CHICO')
  const [destino, setDestino] = useState('')
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const lockerDestino = destino || String(lockerId ?? '')

  async function enviar(evento) {
    evento.preventDefault()
    setExito(null)
    if (!lockerDestino) {
      setError({ titulo: 'Falta el locker', detalle: 'Elegí a qué locker agregar el compartimento.' })
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const compartimento = await crearCompartimento(basic, lockerDestino, tamano)
      setExito(`Compartimento #${compartimento.id} (${compartimento.tamano}) agregado al locker #${compartimento.lockerId}.`)
      onCreado(compartimento.lockerId)
    } catch (e) {
      siNoAutorizado(e)
      setError(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Alta de compartimento</h2>
      <ErrorEnvio error={error} />
      {exito && <Alerta tipo="exito">{exito}</Alerta>}
      <form className="formulario" onSubmit={enviar} noValidate>
        <div className="fila-campos">
          <Campo id="comp-locker" etiqueta="Locker">
            <select id="comp-locker" value={lockerDestino} onChange={(e) => setDestino(e.target.value)}>
              <option value="">Elegí un locker</option>
              {lockers.map((l) => (
                <option key={l.id} value={l.id}>
                  #{l.id} · {l.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="comp-tamano" etiqueta="Tamaño">
            <select id="comp-tamano" value={tamano} onChange={(e) => setTamano(e.target.value)}>
              {TAMANOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Campo>
        </div>
        <button className="boton boton-primario" disabled={enviando || lockers.length === 0}>
          {enviando ? 'Agregando…' : 'Agregar compartimento'}
        </button>
      </form>
    </section>
  )
}

function FilaCompartimento({ basic, compartimento, onCambiado }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  async function cambiar(estado) {
    setGuardando(true)
    setError(null)
    try {
      await cambiarEstadoCompartimento(basic, compartimento.id, estado)
      onCambiado()
    } catch (e) {
      siNoAutorizado(e)
      setError(e)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <tr>
      <td>#{compartimento.id}</td>
      <td>{compartimento.tamano}</td>
      <td>
        <Estado valor={compartimento.estado} />
      </td>
      <td>
        <label className="solo-lectores" htmlFor={`estado-${compartimento.id}`}>
          Nuevo estado del compartimento {compartimento.id}
        </label>
        <select
          id={`estado-${compartimento.id}`}
          value={compartimento.estado}
          disabled={guardando}
          onChange={(e) => cambiar(e.target.value)}
        >
          {ESTADOS_COMPARTIMENTO.map((estado) => (
            <option key={estado}>{estado}</option>
          ))}
        </select>
        {guardando && <span className="texto-suave"> Guardando…</span>}
        {error && (
          <div className="campo-error" role="alert">
            {error.message}
          </div>
        )}
      </td>
    </tr>
  )
}

function Compartimentos({ basic, lockers, lockerId, onElegir }) {
  const cargar = useCallback(
    (signal) => (lockerId ? listarCompartimentos(lockerId, { signal }) : Promise.resolve([])),
    [lockerId],
  )
  const { cargando, datos, error, recargar } = useCarga(cargar)

  return (
    <section className="tarjeta">
      <h2>Cambiar estado de compartimentos</h2>
      <p className="texto-suave">OCUPADO equivale a un paquete depositado; el retiro lo vuelve a dejar DISPONIBLE.</p>
      <Campo id="estado-locker" etiqueta="Locker">
        <select id="estado-locker" value={lockerId ?? ''} onChange={(e) => onElegir(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Elegí un locker</option>
          {lockers.map((l) => (
            <option key={l.id} value={l.id}>
              #{l.id} · {l.nombre} ({l.zona})
            </option>
          ))}
        </select>
      </Campo>
      {!lockerId ? null : cargando && !datos ? (
        <Cargando texto="Cargando compartimentos…" />
      ) : error ? (
        <ErrorCarga error={error} onReintentar={recargar} />
      ) : datos.length === 0 ? (
        <p className="vacio">Este locker todavía no tiene compartimentos.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Id</th>
                <th>Tamaño</th>
                <th>Estado</th>
                <th>Cambiar a</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((c) => (
                <FilaCompartimento key={c.id} basic={basic} compartimento={c} onCambiado={recargar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function Admin() {
  const basic = useCredencialesAdmin()
  const [lockerElegido, setLockerElegido] = useState(null)
  const [versionCompartimentos, setVersionCompartimentos] = useState(0)

  const cargarLockers = useCallback((signal) => listarLockers({ tamanio: 100 }, { signal }), [])
  const { cargando, datos, error, recargar } = useCarga(cargarLockers)
  const lockers = datos?.datos ?? []

  if (!basic) return <IngresoAdmin />

  const alCrearCompartimento = (lockerId) => {
    setLockerElegido(lockerId)
    setVersionCompartimentos((v) => v + 1)
  }

  return (
    <>
      <div className="pagina-encabezado">
        <div>
          <h1>Administración</h1>
          <p>
            Conectado a Lockers como <strong>{basic.usuario}</strong> (HTTP Basic).
          </p>
        </div>
        <button type="button" className="boton boton-secundario" onClick={olvidarCredencialesAdmin}>
          Salir de administración
        </button>
      </div>

      {cargando && !datos ? (
        <Cargando texto="Cargando lockers…" />
      ) : error ? (
        <ErrorCarga error={error} onReintentar={recargar} />
      ) : (
        <div className="dos-columnas">
          <div>
            <DatosDemo
              basic={basic}
              lockersExistentes={lockers}
              onCargado={() => {
                recargar()
                setVersionCompartimentos((v) => v + 1)
              }}
            />
            <AltaLocker basic={basic} onCreado={recargar} />
            <AltaCompartimento
              basic={basic}
              lockers={lockers}
              lockerId={lockerElegido}
              onCreado={alCrearCompartimento}
            />
          </div>
          <div>
            <section className="tarjeta">
              <h2>Lockers ({lockers.length})</h2>
              {lockers.length === 0 ? (
                <p className="vacio">Todavía no hay lockers. Usá “Cargar datos de demo” o el alta manual.</p>
              ) : (
                <ul className="lista">
                  {lockers.map((l) => (
                    <li key={l.id}>
                      <div className="lista-encabezado">
                        <strong>
                          #{l.id} · {l.nombre}
                        </strong>
                        <span className="insignia insignia-neutro">{l.zona}</span>
                      </div>
                      <span className="texto-suave">{l.direccion}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {/* La key cambia al agregar compartimentos o cargar la demo: se vuelve a montar y recarga. */}
            <Compartimentos
              key={versionCompartimentos}
              basic={basic}
              lockers={lockers}
              lockerId={lockerElegido}
              onElegir={setLockerElegido}
            />
          </div>
        </div>
      )}
    </>
  )
}

import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { iniciarSesion } from '../api/usuarios.js'
import { Alerta, Campo, ErrorEnvio } from '../components/ui.jsx'
import { validarLogin } from '../config/validaciones.js'
import { guardarSesion, rutaInicial, useSesion } from '../sesion/sesion.js'

function mensajeDeError(error) {
  if (error.status === 429) {
    const espera = error.retryAfter ? ` Probá de nuevo en ${Math.ceil(error.retryAfter / 60)} min.` : ''
    return { titulo: error.titulo, detalle: `${error.detalle}${espera}` }
  }
  return error
}

export default function Login() {
  const sesion = useSesion()
  const location = useLocation()
  const navigate = useNavigate()
  const aviso = location.state?.aviso
  const [datos, setDatos] = useState({ email: location.state?.email ?? '', password: '' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (sesion && !enviando) return <Navigate to={rutaInicial(sesion)} replace />

  async function enviar(evento) {
    evento.preventDefault()
    const locales = validarLogin(datos)
    setErrores(locales)
    if (Object.keys(locales).length) return
    setEnviando(true)
    setError(null)
    try {
      const respuesta = await iniciarSesion({ email: datos.email.trim(), password: datos.password })
      guardarSesion(respuesta)
      const desde = location.state?.desde
      const destino = respuesta.usuario?.tipo === 'COMPRADOR' && desde ? desde : rutaInicial({ rol: respuesta.usuario?.tipo })
      navigate(destino, { replace: true })
    } catch (e) {
      setErrores(e.errores ?? {})
      setError(mensajeDeError(e))
      setEnviando(false)
    }
  }

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value })

  return (
    <section className="tarjeta centrado">
      <h1>Ingresar</h1>
      <p className="texto-suave">Reservá un locker y retirá tu paquete con un código.</p>
      {aviso && !error && <Alerta tipo={location.state?.tipoAviso ?? 'aviso'}>{aviso}</Alerta>}
      <ErrorEnvio error={error} />
      <form className="formulario" onSubmit={enviar} noValidate>
        <Campo
          id="login-email"
          etiqueta="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={datos.email}
          onChange={cambiar('email')}
          error={errores.email}
        />
        <Campo
          id="login-password"
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          value={datos.password}
          onChange={cambiar('password')}
          error={errores.password}
        />
        <button className="boton boton-primario boton-grande" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p className="texto-suave nota-pie">
        ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
      </p>
    </section>
  )
}

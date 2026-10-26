import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { registrarUsuario } from '../api/usuarios.js'
import { Campo, ErrorEnvio } from '../components/ui.jsx'
import { validarRegistro } from '../config/validaciones.js'
import { rutaInicial, useSesion } from '../sesion/sesion.js'

const TIPOS = [
  { valor: 'COMPRADOR', titulo: 'Comprador', descripcion: 'Reservo lockers y retiro paquetes.' },
  { valor: 'TRANSPORTISTA', titulo: 'Transportista', descripcion: 'Deposito paquetes en los lockers.' },
]

export default function Registro() {
  const sesion = useSesion()
  const navigate = useNavigate()
  const [datos, setDatos] = useState({ nombre: '', email: '', password: '', confirmacion: '', tipo: 'COMPRADOR' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (sesion) return <Navigate to={rutaInicial(sesion)} replace />

  async function enviar(evento) {
    evento.preventDefault()
    const locales = validarRegistro(datos)
    setErrores(locales)
    if (Object.keys(locales).length) return
    setEnviando(true)
    setError(null)
    try {
      const usuario = await registrarUsuario({
        nombre: datos.nombre.trim(),
        email: datos.email.trim(),
        password: datos.password,
        tipo: datos.tipo,
      })
      navigate('/login', {
        state: { email: usuario.email, aviso: `Cuenta creada, ${usuario.nombre}. Ya podés ingresar.`, tipoAviso: 'exito' },
      })
    } catch (e) {
      // 409: el email ya esta registrado. Se marca en el campo ademas del aviso general.
      setErrores(e.status === 409 ? { email: 'Este email ya está registrado.' } : (e.errores ?? {}))
      setError(e)
      setEnviando(false)
    }
  }

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value })

  return (
    <section className="tarjeta centrado">
      <h1>Crear cuenta</h1>
      <ErrorEnvio error={error} />
      <form className="formulario" onSubmit={enviar} noValidate>
        <Campo
          id="registro-nombre"
          etiqueta="Nombre"
          autoComplete="name"
          value={datos.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
        />
        <Campo
          id="registro-email"
          etiqueta="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={datos.email}
          onChange={cambiar('email')}
          error={errores.email}
        />
        <div className="fila-campos">
          <Campo
            id="registro-password"
            etiqueta="Contraseña"
            type="password"
            autoComplete="new-password"
            value={datos.password}
            onChange={cambiar('password')}
            error={errores.password}
            ayuda="Mínimo 6 caracteres."
          />
          <Campo
            id="registro-confirmacion"
            etiqueta="Repetir contraseña"
            type="password"
            autoComplete="new-password"
            value={datos.confirmacion}
            onChange={cambiar('confirmacion')}
            error={errores.confirmacion}
          />
        </div>
        <fieldset className="opciones-tamano opciones-tipo">
          <legend>Tipo de cuenta</legend>
          {TIPOS.map((tipo) => (
            <label key={tipo.valor} className="opcion-tamano">
              <input
                type="radio"
                name="tipo"
                value={tipo.valor}
                checked={datos.tipo === tipo.valor}
                onChange={cambiar('tipo')}
              />
              <strong>{tipo.titulo}</strong>
              <small>{tipo.descripcion}</small>
            </label>
          ))}
        </fieldset>
        {errores.tipo && <small className="campo-error">{errores.tipo}</small>}
        <button className="boton boton-primario boton-grande" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="texto-suave nota-pie">
        ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
      </p>
    </section>
  )
}

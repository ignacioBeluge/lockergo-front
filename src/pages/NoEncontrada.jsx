import { Link } from 'react-router-dom'

export default function NoEncontrada() {
  return (
    <section className="tarjeta centrado vacio">
      <h1>Página no encontrada</h1>
      <p>La dirección no corresponde a ninguna pantalla de LockerGo.</p>
      <Link className="boton boton-primario" to="/">
        Ir al inicio
      </Link>
    </section>
  )
}

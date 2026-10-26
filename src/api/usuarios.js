import { pedir } from './http.js'

// ServicioDeUsuarios (:8081). Registro y login no llevan token.

/** POST /v1/usuarios -> 201 { id, nombre, email, tipo } */
export function registrarUsuario({ nombre, email, password, tipo }) {
  return pedir('usuarios', '/v1/usuarios', { metodo: 'POST', cuerpo: { nombre, email, password, tipo }, auth: 'ninguna' })
}

/** POST /v1/sesiones -> 200 { usuario, token, tipoToken, expiraEnSegundos } */
export function iniciarSesion({ email, password }) {
  return pedir('usuarios', '/v1/sesiones', { metodo: 'POST', cuerpo: { email, password }, auth: 'ninguna' })
}

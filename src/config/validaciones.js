// Validaciones de formulario del lado del cliente. Reflejan las del backend
// (Bean Validation en los DTOs) para avisar antes de enviar; el backend sigue
// siendo la fuente de verdad y sus errores por campo tambien se muestran.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarLogin({ email, password }) {
  const errores = {}
  if (!email.trim()) errores.email = 'Ingresá tu email.'
  else if (!EMAIL.test(email.trim())) errores.email = 'El email no tiene un formato válido.'
  if (!password) errores.password = 'Ingresá tu contraseña.'
  return errores
}

// RegistroUsuarioRequest: nombre y email obligatorios, password >= 6, tipo COMPRADOR | TRANSPORTISTA
export function validarRegistro({ nombre, email, password, confirmacion, tipo }) {
  const errores = {}
  if (!nombre.trim()) errores.nombre = 'Ingresá tu nombre.'
  if (!email.trim()) errores.email = 'Ingresá tu email.'
  else if (!EMAIL.test(email.trim())) errores.email = 'El email no tiene un formato válido.'
  if (password.length < 6) errores.password = 'Debe tener al menos 6 caracteres.'
  if (confirmacion !== password) errores.confirmacion = 'Las contraseñas no coinciden.'
  if (tipo !== 'COMPRADOR' && tipo !== 'TRANSPORTISTA') errores.tipo = 'Elegí un tipo de cuenta.'
  return errores
}

// SolicitudRetiro: codigoRetiro de 6 caracteres alfanumericos, codigoEnvio <= 50
export function validarRetiro({ reservaId, codigoRetiro, codigoEnvio }) {
  const errores = {}
  if (!/^\d+$/.test(String(reservaId).trim()) || Number(reservaId) <= 0) errores.reservaId = 'Ingresá el número de reserva.'
  if (!/^[A-Za-z0-9]{6}$/.test(codigoRetiro.trim())) errores.codigoRetiro = 'El código tiene 6 letras o números.'
  if (!codigoEnvio.trim()) errores.codigoEnvio = 'Ingresá un código de envío.'
  else if (codigoEnvio.trim().length > 50) errores.codigoEnvio = 'Máximo 50 caracteres.'
  return errores
}

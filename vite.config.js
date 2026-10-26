import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Proxy hacia los servicios del backend (repo DesarrolloAplicaciones2).
//
// Por que un proxy y no CORS en el backend: el navegador solo habla con el
// origen del front (localhost:5173) y Vite reenvia cada /api/<servicio>/...
// al puerto que corresponde, sacando el prefijo. Para el navegador hay un
// solo origen, asi que no hay preflight ni headers CORS que configurar: el
// proxy funciona como un gateway minimo. El backend queda sin tocar.
//
// Ejemplo: /api/reservas/v1/reservas/1 -> http://localhost:8083/v1/reservas/1
const servicios = {
  usuarios: 8081,
  lockers: 8082,
  reservas: 8083,
  pagos: 8084,
  notificaciones: 8085,
  logistica: 8086, // integracion-logistica: hoy el front no lo consume
  operaciones: 8087,
}

const proxy = Object.fromEntries(
  Object.entries(servicios).map(([nombre, puerto]) => [
    `/api/${nombre}`,
    {
      target: `http://localhost:${puerto}`,
      changeOrigin: true,
      rewrite: (path) => path.replace(new RegExp(`^/api/${nombre}`), ''),
      // Con "WWW-Authenticate: Basic" el navegador abre su propio dialogo de
      // login ante un 401 de Lockers. El front ya muestra el error (viene en
      // Problem Details), asi que el header se descarta.
      configure: (proxyServer) => {
        proxyServer.on('proxyRes', (respuesta) => {
          delete respuesta.headers['www-authenticate']
        })
      },
    },
  ]),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})

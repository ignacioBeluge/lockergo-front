# LockerGo — Front web

Frontend web de LockerGo (TP de Desarrollo de Aplicaciones II, UADE). Es una SPA en React + Vite (JavaScript) que consume los servicios del backend, que está en otro repositorio (`DesarrolloAplicaciones2`).

Con el backend levantado se puede hacer todo el recorrido sin Postman: registro → login → buscar locker → reservar (contador del hold) → confirmar (código, QR, pago y notificaciones) → retirar con el código.

## Requisitos

- **Node.js LTS 22.12 o superior.** Se probó con Node 24 LTS (el repo trae `.nvmrc`). Con nvm para Windows: `nvm install 24` y `nvm use 24`.
  - Node 20 ya no tiene soporte, y su npm 10 falla en `npm install` con `Cannot read properties of null (reading 'edgesOut')`.
- El backend de LockerGo con sus requisitos: JDK 21 o superior y ActiveMQ 5.19 configurado como indica su README.

## Cómo correrlo

1. **Levantar el backend** desde el repo `DesarrolloAplicaciones2`, en PowerShell:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\demo-up.ps1 -ActiveMqHome C:\apache-activemq-5.19.11
   ```

   Levanta ActiveMQ y los servicios usuarios (8081), lockers (8082), reservas (8083), pagos (8084), notificaciones (8085) y operaciones (8087).

2. **Levantar el front**, en este repo:

   ```bash
   npm install
   npm run dev
   ```

   Después hay que abrir http://localhost:5173.

3. **Cargar datos.** Lockers arranca vacío porque usa H2 en memoria. Hay que entrar a **Administración**, ingresar con el usuario de Lockers (el `admin` en memoria de su `SecurityConfig`) y tocar **Cargar datos de demo**. Eso crea 3 lockers en zonas distintas con compartimentos CHICO, MEDIANO y GRANDE.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con el proxy hacia el backend |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` con el mismo proxy |
| `npm run lint` | oxlint, el linter que trae el template de Vite. Falla ante cualquier warning (`--max-warnings 0`) |

## Proxy en lugar de CORS

El backend no tiene CORS configurado y no se modificó. En `vite.config.js`, `server.proxy` y `preview.proxy` reenvían `/api/<servicio>/...` al puerto del servicio correspondiente y le sacan el prefijo. El navegador ve un solo origen (`localhost:5173`), así que el proxy funciona como un gateway mínimo.

| Prefijo | Servicio |
|---|---|
| `/api/usuarios` | `localhost:8081` |
| `/api/lockers` | `localhost:8082` |
| `/api/reservas` | `localhost:8083` |
| `/api/pagos` | `localhost:8084` |
| `/api/notificaciones` | `localhost:8085` |
| `/api/logistica` | `localhost:8086` (hoy no se usa) |
| `/api/operaciones` | `localhost:8087` |

El proxy además descarta el header `WWW-Authenticate` de las respuestas. Si no lo hiciera, ante un 401 de Lockers el navegador abriría su propio diálogo de usuario y contraseña.

## Mapa de pantallas

| Ruta | Pantalla | Endpoints | Auth |
|---|---|---|---|
| `/login` | Login | `POST /v1/sesiones` | — |
| `/registro` | Registro | `POST /v1/usuarios` | — |
| `/lockers` | Buscar lockers: filtro por zona y disponibilidad por tamaño | `GET /v1/lockers?zona=&pagina=&tamanio=`, `GET /v1/lockers/{id}/compartimentos` | — |
| `/lockers/:id/reservar` | Reservar: tamaño, horas y precio estimado | `GET /v1/lockers/{id}`, `GET /v1/lockers/{id}/compartimentos`, `POST /v1/reservas` (con `Idempotency-Key`) | JWT |
| `/reservas/:id` | Hold con contador regresivo, Confirmar y Cancelar | `GET /v1/reservas/{id}`, `POST /v1/reservas/{id}/confirmacion`, `POST /v1/reservas/{id}/cancelacion`, `GET /v1/compartimentos/{id}` | JWT |
| `/reservas/:id/confirmada` | Código de retiro (texto y QR), pago y notificaciones | `GET /v1/reservas/{id}`, `GET /v1/pagos?reservaId=`, `GET /v1/notificaciones?reservaId=&tipoEvento=RESERVA_CONFIRMADA` | JWT (pagos y notificaciones no piden auth) |
| `/retiro` | Retirar paquete: 201, 202 con seguimiento, 409 y 422 | `POST /v1/retiros`, `GET /v1/retiros/{id}` | JWT |
| `/transportista` | Aviso: los depósitos llegan en una próxima versión | — | JWT con rol TRANSPORTISTA |
| `/admin` | Datos de demo, alta de locker, alta de compartimento y cambio de estado | `GET /v1/lockers`, `POST /v1/lockers`, `POST /v1/lockers/{id}/compartimentos`, `GET /v1/lockers/{id}/compartimentos`, `PATCH /v1/compartimentos/{id}` | HTTP Basic, rol ADMINISTRADOR |

Las pantallas de comprador exigen sesión con `rol` COMPRADOR. Una cuenta TRANSPORTISTA va siempre a `/transportista`.

No hay pantalla de "mis reservas" ni de "mis retiros": Reservas y Operaciones solo exponen `GET /{id}`, sin endpoints de listado.

## Cómo funciona

- **Clientes de la API** (`src/api/`): hay uno por servicio, todos sobre `http.js`.
  - `http.js` agrega el JWT o el HTTP Basic según la llamada.
  - Traduce los Problem Details a un mensaje legible (`title` + `detail`, y `errores` campo por campo en los 400).
  - Ante un 401 en una llamada con JWT cierra la sesión, y la app redirige al login con "Tu sesión venció, volvé a ingresar".
- **Sesión:**
  - El token vive en memoria y se copia a `sessionStorage`, así sobrevive a una recarga pero no a cerrar la pestaña. Nunca se guarda en `localStorage`.
  - De los claims se leen `sub` (id del usuario), `rol` y `exp`. Al vencer el token, la sesión se cierra sola.
  - Logout borra el token y la última reserva guardada.
- **Tarifa:** `src/config/tarifas.js` replica `TarifaPorTamanoYDuracion` del backend: 100, 150 o 220 $/h según el tamaño. Con eso se muestra el "Precio estimado" antes de reservar; después se muestra el `precioEstimado` que devuelve Reservas.
- **Reserva y 409:**
  - Reservas no marca el compartimento al crear un hold, así que Lockers lo sigue mostrando DISPONIBLE.
  - Si el POST responde 409, se prueba el siguiente compartimento libre del mismo tamaño, con tope igual a la cantidad de libres.
  - Si se agotan, se muestra "No hay compartimentos libres de ese tamaño en este locker".
- **Contador del hold:**
  - Usa `horaExpiracionHold`, corregida con el header `Date` de la respuesta para no depender del reloj de la PC.
  - En 0 muestra el hold expirado y deshabilita Confirmar.
  - Reservas expira los holds con un job cada 30 s, así que en el backend la reserva puede figurar ACTIVA unos segundos más.
- **Código de retiro:**
  - Solo viene en la respuesta de la confirmación.
  - Se guarda en `sessionStorage` (id de reserva y código) para mostrarlo al recargar y para prellenar Retirar paquete.
- **Pago y notificaciones:**
  - Llegan por mensajería, unos segundos después de confirmar. La pantalla consulta cada 2 s hasta tener el pago y los tres canales (EMAIL, PUSH y SMS).
  - Se descartan registros anteriores a la confirmación, porque los ids de reserva se repiten si se reinicia Reservas.
- **Retiro con 202:**
  - Se consulta `GET /v1/retiros/{id}` cada 3 s hasta COMPLETADO, RECHAZADO o FALLIDO.
  - La pantalla muestra los intentos de validación y la cantidad de consultas.
- **`codigoEnvio`:** el backend todavía lo pide en el body (es una simplificación temporal del backend). El front lo completa como `ENV-<reserva>` y aclara que es un valor de demo.
- **Admin:** las credenciales Basic quedan solo en memoria y se pierden al recargar.
- **Tema claro/oscuro:**
  - Todo se arma con variables CSS.
  - Sin elección guardada, sigue `prefers-color-scheme`. El toggle guarda la elección en `localStorage`, que es una preferencia visual y no un dato sensible.

## Escenario "Reservas lenta"

Desde el repo del backend:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo-up.ps1 -Servicios servicio-reservas,servicio-operaciones -ReservasLenta -SinPackage
```

Reiniciar Reservas borra sus datos en memoria. Hay que hacer otra reserva y confirmarla. El JWT sigue sirviendo porque Usuarios no se reinicia.

En Retirar paquete, el pedido responde 202 y la pantalla muestra **Validando…** con los intentos. Unos 25 s después llega sola a **COMPLETADO**.

## Estructura

```
src/
├── api/          # http.js + un cliente por servicio
├── components/   # Layout, guardas de rutas, piezas de UI
├── config/       # tarifas, datos de demo, validaciones, disponibilidad
├── hooks/        # useCarga, useCuentaRegresiva
├── pages/        # una por pantalla
├── sesion/       # sesión JWT y credenciales de admin
├── tema/         # tema claro/oscuro
└── index.css     # estilos con variables (responsive: 375, 768 y 1280 px)
```

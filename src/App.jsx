import { Route, Routes } from 'react-router-dom'
import { Inicio, RequiereRol } from './components/Guardas.jsx'
import Layout from './components/Layout.jsx'
import Admin from './pages/Admin.jsx'
import Confirmada from './pages/Confirmada.jsx'
import Hold from './pages/Hold.jsx'
import Lockers from './pages/Lockers.jsx'
import Login from './pages/Login.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'
import Registro from './pages/Registro.jsx'
import Reservar from './pages/Reservar.jsx'
import Retiro from './pages/Retiro.jsx'
import Transportista from './pages/Transportista.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Registro />} />
        <Route path="admin" element={<Admin />} />

        <Route element={<RequiereRol rol="COMPRADOR" />}>
          <Route path="lockers" element={<Lockers />} />
          <Route path="lockers/:lockerId/reservar" element={<Reservar />} />
          <Route path="reservas/:id" element={<Hold />} />
          <Route path="reservas/:id/confirmada" element={<Confirmada />} />
          <Route path="retiro" element={<Retiro />} />
        </Route>

        <Route element={<RequiereRol rol="TRANSPORTISTA" />}>
          <Route path="transportista" element={<Transportista />} />
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  )
}

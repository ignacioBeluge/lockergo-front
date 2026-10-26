import { Route, Routes } from 'react-router-dom'
import { Inicio, RequiereRol } from './components/Guardas.jsx'
import Layout from './components/Layout.jsx'
import Admin from './pages/Admin.jsx'
import Login from './pages/Login.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'
import Registro from './pages/Registro.jsx'
import Transportista from './pages/Transportista.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Registro />} />
        <Route path="admin" element={<Admin />} />

        <Route element={<RequiereRol rol="TRANSPORTISTA" />}>
          <Route path="transportista" element={<Transportista />} />
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  )
}

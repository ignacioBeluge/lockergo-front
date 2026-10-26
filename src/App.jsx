import { Route, Routes } from 'react-router-dom'
import { Inicio } from './components/Guardas.jsx'
import Layout from './components/Layout.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  )
}

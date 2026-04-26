import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/layout/Layout"
import Home from "./pages/Home"
import EDA from "./pages/EDA"
import Preprocessing from "./pages/Preprocessing"
import Export from "./pages/Export"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="eda" element={<EDA />} />
          <Route path="preprocessing" element={<Preprocessing />} />
          <Route path="export" element={<Export />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/layout/Layout"
import Home from "./pages/Home"
import EDA from "./pages/EDA"
import Preprocessing from "./pages/Preprocessing"
import Export from "./pages/Export"

import Datasets from "./pages/Datasets"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="datasets" element={<Datasets />} />
          <Route path="eda" element={<EDA />} />
          <Route path="preprocessing" element={<Preprocessing />} />
          <Route path="export" element={<Export />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

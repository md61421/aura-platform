import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css'
import Home from "./pages/Home";
import Detail from "./pages/Detail";
import Submission from "./pages/Submission";
import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/artifact/:id" element={<Detail />} />
          <Route path="/submit" element={<Submission />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App

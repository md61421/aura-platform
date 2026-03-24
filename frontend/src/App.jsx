import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Detail from "./pages/Detail";
import Submission from "./pages/Submission";
import Admin from "./pages/Admin";
import Compare from "./pages/Compare";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/artifact/:id" element={<Detail />} />
          <Route path="/submit" element={<Submission />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

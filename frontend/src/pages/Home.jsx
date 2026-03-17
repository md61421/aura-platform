import { useState } from "react";
import data from "../data.json";
import { Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";

function Home() {
  const [query, setQuery] = useState("");

  const filtered = data.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.symptoms.some((s) => s.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="app-container">
      <header className="header animate-fade-in">
        <h1>AURA Platform</h1>
        <p>
          An interactive platform for exploring perfusion MRI artifacts.
        </p>
      </header>

      <SearchBar query={query} setQuery={setQuery} />

      <div className="grid">
        {filtered.map((a) => (
          <Link 
            key={a.id} 
            to={`/artifact/${a.id}`}
            className="artifact-card glass animate-fade-in"
          >
            <div className="artifact-image-container">
              <img src={a.examples[0]} alt={a.name} />
              <div className="artifact-overlay"></div>
            </div>
            <div className="artifact-info">
              <span className="artifact-category">{a.category}</span>
              <h3 className="artifact-name">{a.name}</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                {a.description.substring(0, 45)}...
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;

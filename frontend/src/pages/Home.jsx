import { useState, useMemo } from "react";
import data from "../data.json";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import ArtifactCard from "../components/ArtifactCard";

function Home() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [activeModality, setActiveModality] = useState("");

  const categories = useMemo(() => [...new Set(data.map(a => a.category))], []);
  const modalities = useMemo(() => [...new Set(data.map(a => a.modality))], []);

  const filtered = data.filter((artifact) => {
    const matchesQuery = 
      artifact.name.toLowerCase().includes(query.toLowerCase()) ||
      artifact.symptoms.some((s) => s.toLowerCase().includes(query.toLowerCase())) ||
      artifact.category.toLowerCase().includes(query.toLowerCase());
    
    const matchesCategory = !activeCategory || artifact.category === activeCategory;
    const matchesModality = !activeModality || artifact.modality === activeModality;

    return matchesQuery && matchesCategory && matchesModality;
  });

  return (
    <div className="home-page animate-fade-in">
      <section className="hero-section" style={{textAlign: 'center', marginBottom: '1.5rem'}}>
        <h1 style={{fontSize: '2rem', marginBottom: '0.5rem'}}>Welcome to AURA</h1>
        <p style={{fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto'}}>
          A User Repository of Artifacts for Perfusion Imaging
        </p>
      </section>


      <SearchBar query={query} setQuery={setQuery} />
      
      <FilterBar 
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        activeModality={activeModality}
        setActiveModality={setActiveModality}
        categories={categories}
        modalities={modalities}
      />

      <div className="results-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h2 className="section-title" style={{margin: 0}}>Artifact Library</h2>
        <span style={{color: 'var(--text-muted)', fontWeight: 600}}>
          Showing {filtered.length} results
        </span>
      </div>

      <div className="grid">
        {filtered.map((artifact) => (
          <ArtifactCard key={artifact.id} artifact={artifact} />
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div style={{textAlign: 'center', padding: '5rem 0'}}>
          <h3>No artifacts found matching your criteria.</h3>
          <p>Try adjusting your filters or search query.</p>
        </div>
      )}
    </div>
  );
}

export default Home;

import "./FilterBar.css";

function FilterBar({ activeCategory, setActiveCategory, activeModality, setActiveModality, categories, modalities }) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Modality:</label>
        <div className="filter-options">
          <button 
            className={`filter-chip ${!activeModality ? 'active' : ''}`}
            onClick={() => setActiveModality("")}
          >
            All
          </button>
          {modalities.map(m => (
            <button 
              key={m}
              className={`filter-chip ${activeModality === m ? 'active' : ''}`}
              onClick={() => setActiveModality(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label>Category:</label>
        <div className="filter-options">
          <button 
            className={`filter-chip ${!activeCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory("")}
          >
            All
          </button>
          {categories.map(c => (
            <button 
              key={c}
              className={`filter-chip ${activeCategory === c ? 'active' : ''}`}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FilterBar;

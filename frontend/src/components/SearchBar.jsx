import "./SearchBar.css";

function SearchBar({ query, setQuery }) {
  return (
    <div className="search-section">
      <div className="search-box">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className="search-input"
          type="text"
          placeholder="Search artifacts name, symptoms, or category..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery("")}>
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;

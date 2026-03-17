function SearchBar({ query, setQuery }) {
  return (
    <div className="search-container animate-fade-in">
      <div className="search-input-wrapper">
        <input
          className="search-input"
          type="text"
          placeholder="Search by symptom or name (e.g. blur, ghosting)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </div>
  );
}

export default SearchBar;

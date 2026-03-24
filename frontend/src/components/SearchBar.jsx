/**
 * Reusable SearchBar component for filtering artifacts.
 */
function SearchBar({ query, setQuery }) {
  return (
    <div className="relative group max-w-2xl mx-auto">
      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20">
        <i className="fas fa-search text-gray-400 group-focus-within:text-brand-500 transition-colors"></i>
      </div>
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full pl-14 pr-6 py-5 border border-gray-200 rounded-2xl leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300" 
        placeholder="Search by signs (e.g., shadows, lines) or example names..."
      />
    </div>
  );
}

export default SearchBar;

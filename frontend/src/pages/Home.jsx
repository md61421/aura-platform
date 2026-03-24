import FilterSidebar from "../components/FilterSidebar";
import ArtifactCard from "../components/ArtifactCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import { useArtifacts } from "../hooks/useArtifacts";

function Home() {
  const { 
    filteredArtifacts: filtered, 
    isLoading,
    query, 
    setQuery, 
    clearFilters
  } = useArtifacts();

  if (isLoading) {
    return <div className="text-center py-20 text-gray-500">Loading artifacts...</div>;
  }

  return (
    <div className="animate-fade-in">
      {/* Hero / Search */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Welcome to AURA
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          A User Repository of Artifacts for Perfusion Imaging
        </p>
        
        <SearchBar 
          query={query} 
          setQuery={setQuery} 
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <FilterSidebar />

        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-900">{filtered.length}</span> artifacts
            </p>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><i className="fas fa-th-large"></i></button>
              <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><i className="fas fa-list"></i></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
          
          {filtered.length > 0 && <Pagination />}

          {filtered.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
              <i className="fas fa-search text-4xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No artifacts found</h3>
              <p className="text-gray-500">Try adjusting your filters or search terms.</p>
              <button 
                onClick={clearFilters}
                className="mt-4 text-brand-500 font-medium hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;

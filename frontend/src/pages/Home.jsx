import { useState } from "react";
import FilterSidebar from "../components/FilterSidebar";
import ArtifactCard from "../components/ArtifactCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import { useArtifacts } from "../hooks/useArtifacts";

function Home() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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

  const toggleFilters = () => setIsFilterOpen(!isFilterOpen);

  return (
    <div className="animate-fade-in px-4 sm:px-0">
      {/* Hero / Search */}
      <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
          Welcome to AURA
        </h1>
        <p className="text-base md:text-xl text-gray-500 mb-6 md:mb-10">
          A User Repository of Artifacts for Perfusion Imaging
        </p>
        
        <div className="px-2 sm:px-0">
          <SearchBar 
            query={query} 
            setQuery={setQuery} 
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 relative">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden flex justify-between items-center mb-4">
          <button 
            onClick={toggleFilters}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <i className={`fas ${isFilterOpen ? 'fa-times' : 'fa-filter'} text-brand-500`}></i>
            {isFilterOpen ? 'Close Filters' : 'Show Filters'}
          </button>
          
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-900">{filtered.length}</span> artifacts found
          </p>
        </div>

        {/* Sidebar - Collapsible on Mobile */}
        <div className={`${isFilterOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0 animate-slide-in-left lg:animate-none`}>
          <FilterSidebar />
        </div>

        <div className="flex-1">
          <div className="hidden lg:flex justify-between items-center mb-6">
            <p className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-900">{filtered.length}</span> artifacts
            </p>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-200 hover:text-gray-900 transition-colors"><i className="fas fa-th-large"></i></button>
              <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><i className="fas fa-list"></i></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
          
          {filtered.length > 0 && (
            <div className="mt-8">
              <Pagination />
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 md:py-24 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-search text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No artifacts found</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your filters or search terms to find what you're looking for.</p>
              <button 
                onClick={clearFilters}
                className="mt-6 px-6 py-2 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors shadow-lg shadow-brand-200"
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

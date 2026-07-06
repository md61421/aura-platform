import { useMemo, useState } from "react";
import FilterSidebar from "../components/FilterSidebar";
import ArtifactCard from "../components/ArtifactCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import { useArtifacts } from "../hooks/useArtifacts";

const SORT_OPTIONS = [
  { value: "reliability", shortLabel: "Reliability", label: "Reliability Score (High-Low)" },
  { value: "name", shortLabel: "A-Z", label: "Alphabetical (A-Z)" },
  { value: "date", shortLabel: "Newest", label: "Date Added (Newest)" },
  { value: "date_oldest", shortLabel: "Oldest", label: "Date Added (Oldest)" },
];

const ITEMS_PER_PAGE = 9;

function Home() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { 
    filteredArtifacts: filtered, 
    isLoading,
    error,
    query, 
    setQuery, 
    sortBy,
    setSortBy,
    clearFilters
  } = useArtifacts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const pageEnd = pageStart + ITEMS_PER_PAGE;
  const visibleArtifacts = useMemo(
    () => filtered.slice(pageStart, pageEnd),
    [filtered, pageStart, pageEnd],
  );
  const visibleStart = filtered.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageEnd, filtered.length);

  const handleQueryChange = (value) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    clearFilters();
    setCurrentPage(1);
  };

  if (isLoading) {
    return <div className="text-center py-20 text-gray-500">Loading artifacts...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20 text-gray-500">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to load artifacts</h2>
        <p>Check that the FastAPI backend is running and reachable.</p>
      </div>
    );
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
            setQuery={handleQueryChange} 
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 relative">
        {/* Mobile Filter & Sort Toggle */}
        <div className="lg:hidden flex flex-wrap justify-between items-center gap-3 mb-4 w-full">
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFilters}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <i className={`fas ${isFilterOpen ? 'fa-times' : 'fa-filter'} text-brand-500`}></i>
              {isFilterOpen ? 'Close Filters' : 'Filters'}
            </button>
            
            <select 
              value={sortBy} 
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded-xl py-2 px-2.5 font-semibold focus:outline-none transition-all cursor-pointer shadow-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.shortLabel}
                </option>
              ))}
            </select>
          </div>
          
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-900">{filtered.length}</span> found
          </p>
        </div>

        {/* Sidebar - Collapsible on Mobile */}
        <div className={`${isFilterOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0 animate-slide-in-left lg:animate-none`}>
          <FilterSidebar />
        </div>

        <div className="flex-1">
          {/* Desktop Filter / Grid Header */}
          <div className="hidden lg:flex justify-between items-center mb-6">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {visibleStart}-{visibleEnd}
              </span>{" "}
              of <span className="font-semibold text-gray-900">{filtered.length}</span> artifacts
            </p>
            <div className="flex items-center gap-4">
              {/* Desktop Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort By:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-white border border-gray-250 text-gray-700 text-xs rounded-xl py-1.5 px-3 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all cursor-pointer shadow-2xs"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleArtifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
          
          {filtered.length > 0 && (
            <div className="mt-8">
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
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
                onClick={handleClearFilters}
                className="mt-6 px-6 py-2 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors shadow-lg shadow-brand-200 cursor-pointer"
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

/**
 * Reusable Pagination component (mock).
 */
function Pagination() {
  return (
    <div className="mt-8 flex justify-center">
      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
        <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <span className="sr-only">Previous</span>
          <i className="fas fa-chevron-left"></i>
        </button>
        <button aria-current="page" className="z-10 bg-brand-50 border-brand-500 text-brand-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors">
          1
        </button>
        <button className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors">
          2
        </button>
        <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <span className="sr-only">Next</span>
          <i className="fas fa-chevron-right"></i>
        </button>
      </nav>
    </div>
  );
}

export default Pagination;

const getPageNumbers = (currentPage, totalPages) => {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
};

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const goToPrevious = () => onPageChange(Math.max(1, currentPage - 1));
  const goToNext = () => onPageChange(Math.min(totalPages, currentPage + 1));

  return (
    <div className="mt-8 flex justify-center">
      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
        <button
          type="button"
          onClick={goToPrevious}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
        >
          <span className="sr-only">Previous</span>
          <i className="fas fa-chevron-left"></i>
        </button>

        {pageNumbers.map((page, index) => (
          <div key={page} className="contents">
            {index > 0 && page - pageNumbers[index - 1] > 1 && (
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-400">
                ...
              </span>
            )}
            <button
              type="button"
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => onPageChange(page)}
              className={
                page === currentPage
                  ? "z-10 bg-brand-50 border-brand-500 text-brand-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors"
              }
            >
              {page}
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={goToNext}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
        >
          <span className="sr-only">Next</span>
          <i className="fas fa-chevron-right"></i>
        </button>
      </nav>
    </div>
  );
}

export default Pagination;

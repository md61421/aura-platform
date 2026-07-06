const FilterSidebar = ({ filters, filterOptions, onFilterChange, onReset }) => {
    const renderOption = (group, value) => (
        <label key={value} className="flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 bg-transparent cursor-pointer"
                checked={filters[group].includes(value)}
                onChange={() => onFilterChange(group, value)}
            />
            <span className={`ml-2 text-sm ${filters[group].includes(value) ? 'text-brand-600 font-semibold' : 'text-gray-600'}`}>
                {value}
            </span>
        </label>
    );

    return (
        <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 lg:sticky lg:top-24">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                    <button 
                        type="button"
                        onClick={onReset}
                        className="text-sm text-brand-500 hover:text-brand-600"
                    >
                        Reset
                    </button>
                </div>
                
                {/* Modality */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Modality</h4>
                    <div className="space-y-2">
                        {filterOptions.modalities.map((modality) => renderOption("modalities", modality))}
                    </div>
                </div>

                {/* Category */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Category</h4>
                    <div className="space-y-2">
                        {filterOptions.categories.map((category) => renderOption("categories", category))}
                    </div>
                </div>

                {/* Scanner */}
                <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Scanner</h4>
                    <select
                        value={filters.scanner}
                        onChange={(event) => onFilterChange("scanner", event.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md bg-white text-gray-900"
                    >
                        <option value="">All Scanners</option>
                        {filterOptions.scanners.map((scanner) => (
                            <option key={scanner} value={scanner}>
                                {scanner}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </aside>
    );
};

export default FilterSidebar;

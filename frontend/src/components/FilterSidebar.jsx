import React, { useState } from 'react';

const FilterSidebar = () => {
    // Moved states to internal to make it "useless" to the parent, but still interactive for the user
    const [activeModality, setActiveModality] = useState('');
    const [activeCategory, setActiveCategory] = useState('');

    return (
        <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 lg:sticky lg:top-24">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                    <button 
                        onClick={() => { setActiveModality(''); setActiveCategory(''); }}
                        className="text-sm text-brand-500 hover:text-brand-600"
                    >
                        Reset
                    </button>
                </div>
                
                {/* Modality */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Modality</h4>
                    <div className="space-y-2">
                        {['ASL', 'DSC', 'DCE', 'EPI'].map(mod => (
                            <label key={mod} className="flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 bg-transparent cursor-pointer"
                                    checked={activeModality === mod}
                                    onChange={() => setActiveModality(activeModality === mod ? '' : mod)}
                                />
                                <span className={`ml-2 text-sm ${activeModality === mod ? 'text-brand-600 font-semibold' : 'text-gray-600'}`}>
                                    {mod}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Category */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Category</h4>
                    <div className="space-y-2">
                        {['Motion', 'Susceptibility', 'Hardware/RF', 'Flow'].map(cat => (
                            <label key={cat} className="flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 bg-transparent cursor-pointer"
                                    checked={activeCategory === cat}
                                    onChange={() => setActiveCategory(activeCategory === cat ? '' : cat)}
                                />
                                <span className={`ml-2 text-sm ${activeCategory === cat ? 'text-brand-600 font-semibold' : 'text-gray-600'}`}>
                                    {cat}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Scanner */}
                <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Scanner</h4>
                    <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md bg-white text-gray-900">
                        <option>All Scanners</option>
                        <option>Siemens</option>
                        <option>GE Healthcare</option>
                        <option>Philips</option>
                    </select>
                </div>
            </div>
        </aside>
    );
};

export default FilterSidebar;

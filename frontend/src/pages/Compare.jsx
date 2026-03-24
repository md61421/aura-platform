import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Compare = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedArtifact, setSelectedArtifact] = useState(null);

    const handleSelect = (name, category, iconBg, iconColorClass) => {
        setSelectedArtifact({ name, category, iconBg, iconColorClass });
        setIsModalOpen(false);
    };

    return (
        <div className="animate-fade-in h-full relative">
            <div className="flex justify-between items-center mb-6">
                <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                    <i className="fas fa-arrow-left mr-2"></i> Back to Browse
                </Link>
                <div className="flex gap-2 bg-gray-200 p-1 rounded-lg">
                    <button className="px-3 py-1 rounded bg-white text-gray-900 shadow-sm text-sm font-medium">Side-by-side</button>
                    <button className="px-3 py-1 rounded text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Overlay/Slider</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[70vh]">
                {/* Artifact 1 */}
                <div className="bg-white rounded-2xl flex flex-col overflow-hidden border border-gray-200 shadow-sm">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Patient Motion Ghosting</h3>
                        <span className="text-xs px-2 py-1 bg-brand-100 text-brand-800 rounded">Current</span>
                    </div>
                    <div className="flex-1 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 12px)' }}></div>
                         <i className="fas fa-brain text-6xl text-slate-500 z-0"></i>
                    </div>
                </div>

                {/* Artifact 2 (Selector State) */}
                <div className="bg-white rounded-2xl flex flex-col overflow-hidden border border-dashed border-gray-300 shadow-sm">
                    {!selectedArtifact ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <i className="fas fa-plus text-gray-400 text-xl"></i>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Artifact to Compare</h3>
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="mt-4 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-lg shadow-brand-500/20 active:scale-95 transition-all text-sm"
                            >
                                Choose from Library
                            </button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col animate-fade-in">
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900">{selectedArtifact.name}</h3>
                                <button 
                                    onClick={() => setSelectedArtifact(null)}
                                    className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                                >
                                    Change
                                </button>
                            </div>
                            <div className="flex-1 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-x-0 top-1/2 h-1 bg-white/20"></div>
                                <i className={`fas fa-brain text-6xl ${selectedArtifact.iconColorClass} z-0`}></i>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Comparison Selector Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60]">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsModalOpen(false)}
                    ></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-8 border border-gray-200 animate-fade-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Select Comparison Artifact</h3>
                        <div className="relative mb-6">
                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input 
                                type="text" 
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow" 
                                placeholder="Search by name..." 
                            />
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            <div 
                                onClick={() => handleSelect('RF Zipper Artifact', 'Hardware / RF Feedthrough', 'bg-slate-800', 'text-slate-500')}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-brand-500 group"
                            >
                                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 group-hover:scale-105 transition-transform"><i className="fas fa-brain"></i></div>
                                <div>
                                    <div className="font-bold text-gray-900 group-hover:text-brand-500 transition-colors">RF Zipper Artifact</div>
                                    <div className="text-xs text-gray-500">Hardware / RF Feedthrough</div>
                                </div>
                            </div>
                            <div 
                                onClick={() => handleSelect('Signal Dropout near Sinuses', 'Susceptibility / B0', 'bg-slate-900', 'text-slate-600')}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-brand-500 group"
                            >
                                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-slate-600 group-hover:scale-105 transition-transform"><i className="fas fa-brain"></i></div>
                                <div>
                                    <div className="font-bold text-gray-900 group-hover:text-brand-500 transition-colors">Signal Dropout near Sinuses</div>
                                    <div className="text-xs text-gray-500">Susceptibility / B0</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Compare;

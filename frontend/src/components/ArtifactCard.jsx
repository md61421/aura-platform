import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategoryStyles } from '../utils/helpers';

const ArtifactCard = ({ artifact }) => {
    const navigate = useNavigate();
    const { badge, placeholder } = getCategoryStyles(artifact.category);

    return (
        <div 
            onClick={() => navigate(`/artifact/${artifact.id}`)}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
        >
            <div className="relative h-48 overflow-hidden bg-gray-200 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 transition-opacity opacity-0 group-hover:opacity-100 flex items-end p-4">
                    <span className="text-white text-sm font-medium flex items-center gap-2">
                        View Details <i className="fas fa-arrow-right"></i>
                    </span>
                </div>
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 relative">
                    {/* Placeholder behind image */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        {placeholder}
                        <i className="fas fa-brain text-4xl"></i>
                    </div>
                    {/* Real Image */}
                    {artifact.examples && artifact.examples[0] && (
                        <img 
                            src={artifact.examples[0]} 
                            alt={artifact.name} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    )}
                </div>
                <div className="absolute top-3 left-3 z-20">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${badge}`}>
                        {artifact.category}
                    </span>
                </div>
            </div>
            <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-brand-500 transition-colors">
                        {artifact.name}
                    </h3>
                </div>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {artifact.description || artifact.explanation}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-gray-600 bg-gray-100 border border-gray-200">
                        <i className="fas fa-microscope mr-1.5 text-brand-500"></i> {artifact.modality || 'ASL'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-gray-600 bg-gray-100 border border-gray-200">
                        <i className="fas fa-hospital mr-1.5 text-brand-500"></i> {artifact.scanner || 'Siemens'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ArtifactCard;

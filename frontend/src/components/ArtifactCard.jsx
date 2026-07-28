import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategoryStyles } from '../utils/helpers';

const ArtifactCard = ({ artifact }) => {
    const navigate = useNavigate();
    const { badge, placeholder } = getCategoryStyles(artifact.category);

    const reliability = (artifact.agreements || 0) - (artifact.disagreements || 0);
    
    // Choose reliability pill color and icon based on the score
    let scoreStyles = {
        pill: 'bg-gray-50 text-gray-600 border-gray-200',
        icon: <i className="fas fa-thumbs-up text-gray-400 mr-1"></i>
    };

    if (reliability >= 15) {
        scoreStyles = {
            pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
            icon: <i className="fas fa-shield-halved text-emerald-500 mr-1"></i>
        };
    } else if (reliability >= 5) {
        scoreStyles = {
            pill: 'bg-teal-50 text-teal-700 border-teal-200',
            icon: <i className="fas fa-thumbs-up text-teal-500 mr-1"></i>
        };
    } else if (reliability < 0) {
        scoreStyles = {
            pill: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
            icon: <i className="fas fa-circle-exclamation text-rose-500 mr-1"></i>
        };
    }

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
                {/* Category Badge - Top Left */}
                <div className="absolute top-3 left-3 z-20">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${badge}`}>
                        {artifact.category}
                    </span>
                </div>

                {/* Verification Status Badge - Top Right */}
                <div className="absolute top-3 right-3 z-20">
                    {artifact.status === "OSIPI Verified" ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/90 text-white border border-emerald-400 backdrop-blur-sm flex items-center gap-1 shadow-sm">
                            <i className="fas fa-circle-check text-[10px]"></i> Verified
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase bg-slate-800/85 text-slate-200 border border-slate-600 backdrop-blur-sm flex items-center gap-1 shadow-sm">
                            <i className="fas fa-users text-[10px]"></i> Contributor
                        </span>
                    )}
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
                        <i className="fas fa-hospital mr-1.5 text-brand-500"></i> {artifact.scanner || 'Unknown vendor'}
                    </span>
                    {/* Reliability Pill */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${scoreStyles.pill}`}>
                        {scoreStyles.icon}
                        Score: {reliability > 0 ? `+${reliability}` : reliability}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ArtifactCard;

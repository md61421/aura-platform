import { useState } from "react";

/**
 * ImageGallery component for artifact examples.
 * Extracted from Detail page.
 */
function ImageGallery({ artifact, placeholder }) {
  const [activeImg, setActiveImg] = useState(0);

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center shadow-inner mb-4">
        {(!artifact.examples || !artifact.examples[activeImg]) && (
          <div className="flex flex-col items-center justify-center text-slate-500">
            {placeholder}
            <i className="fas fa-brain text-6xl mt-4 opacity-50"></i>
            <p className="mt-4 text-sm font-medium">No image available</p>
          </div>
        )}
        
        {/* Main Image */}
        {artifact.examples && artifact.examples[activeImg] && (
          <img 
            src={artifact.examples[activeImg]} 
            alt={artifact.name} 
            className="absolute inset-0 w-full h-full object-contain z-10" 
          />
        )}

        <div className="absolute top-4 right-4 flex gap-2 z-20">
          <button className="w-10 h-10 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 flex items-center justify-center transition-colors">
            <i className="fas fa-expand"></i>
          </button>
        </div>
      </div>
      
      {/* Thumbnails */}
      <div className="flex gap-3 overflow-x-auto pb-2 mt-auto">
        {artifact.examples && artifact.examples.map((img, idx) => (
          <div 
            key={idx}
            onClick={() => setActiveImg(idx)}
            className={`w-20 h-20 rounded-xl bg-slate-800 flex-shrink-0 cursor-pointer border-2 transition-all flex items-center justify-center overflow-hidden ${
              activeImg === idx ? 'border-brand-500' : 'border-transparent hover:border-gray-500'
            }`}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImageGallery;

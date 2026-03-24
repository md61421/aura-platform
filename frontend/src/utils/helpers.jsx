export const getCategoryStyles = (category) => {
    switch (category?.toLowerCase()) {
        case 'motion':
            return {
                badge: 'bg-red-100 text-red-800 border border-red-200',
                placeholder: (
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 8px)' }}></div>
                )
            };
        case 'susceptibility':
        case 'magnetic field':
        case 'magnetic effects':
            return {
                badge: 'bg-purple-100 text-purple-800 border border-purple-200',
                placeholder: (
                    <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-transparent via-white/10 to-transparent transform rotate-45 scale-150"></div>
                )
            };
        case 'hardware':
        case 'hardware/rf':
        case 'rf field':
            return {
                badge: 'bg-amber-100 text-amber-800 border border-amber-200',
                placeholder: (
                    <div className="absolute inset-0 flex flex-col justify-around opacity-20">
                        <div className="h-1 bg-white w-full"></div><div className="h-1 bg-white w-full"></div><div className="h-1 bg-white w-full"></div>
                    </div>
                )
            };
        default:
            return {
                badge: 'bg-brand-100 text-brand-800 border border-brand-200',
                placeholder: (
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 12px)' }}></div>
                )
            };
    }
};

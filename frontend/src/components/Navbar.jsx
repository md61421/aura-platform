import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();

    const navLinks = [
        { name: 'Browse', path: '/' },
        { name: 'Submit Artifact', path: '/submit' },
        // { name: 'Compare', path: '' },
        { name: 'Review', path: '', badge: true },
        { name: 'My Submissions', path: '' },
    ];

    return (
        <nav className="fixed w-full z-50 glass border-b border-gray-200 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
                            <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md border border-gray-100">
                                <img alt="OSIPI Logo" className="h-full w-full object-contain" src="https://avatars.githubusercontent.com/u/46761096?s=280&amp;v=4" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-gray-900">OSIPI</span>
                        </Link>
                        <div className="hidden md:ml-10 md:flex md:space-x-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                                        location.pathname === link.path
                                            ? 'border-brand-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {link.badge ? (
                                        <span className="flex items-center gap-1.5">
                                            {link.name} <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
                                        </span>
                                    ) : (
                                        link.name
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link to="" className="hidden sm:flex items-center hover:opacity-80 transition-opacity">
                            <img className="h-8 w-8 rounded-full border border-gray-300" src="https://ui-avatars.com/api/?name=Md+Sahil&background=0ea5e9&color=fff" alt="User" />
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

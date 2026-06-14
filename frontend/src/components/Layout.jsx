import Navbar from "./Navbar";

function Layout({ children }) {
  return (
    <div className="min-h-screen transition-colors duration-300">
      <Navbar />
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center text-white font-bold text-xs">A</div>
                <span className="font-semibold text-gray-900">AURA Platform</span>
            </div>
            <p className="text-sm text-gray-500">An OSIPI Project for standardizing perfusion imaging artifacts.</p>
            <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-gray-500"><i className="fab fa-github"></i></a>
                <a href="#" className="text-gray-400 hover:text-gray-500"><i className="fab fa-twitter"></i></a>
            </div>
        </div>
      </footer>

    </div>
  );
}

export default Layout;

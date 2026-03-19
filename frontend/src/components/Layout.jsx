import { Link } from "react-router-dom";
import "./Layout.css";

function Layout({ children }) {
  return (
    <div className="layout-wrapper">
      <header className="main-header">
        <div className="container header-content">
          <Link to="/" className="logo">
            <img 
              src="https://avatars.githubusercontent.com/u/46761096?s=280&v=4" 
              alt="AURA Platform Logo" 
              className="logo-image"
            />
            <div className="logo-text-container">
              <span className="logo-title">AURA</span>
              <span className="logo-subtitle">OSIPI Artifacts</span>
            </div>
          </Link>
          <nav className="main-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/submit" className="btn btn-accent pulse-on-hover">Contribute</Link>
          </nav>
        </div>
      </header>
      
      <main className="main-content container">
        {children}
      </main>

      <footer className="main-footer">
        <div className="container footer-content">
          <p>&copy; {new Date().getFullYear()} AURA Platform. Designed for Researchers & Clinicians.</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;

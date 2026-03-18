import { Link } from "react-router-dom";
import "./Layout.css";

function Layout({ children }) {
  return (
    <div className="layout-wrapper">
      <header className="main-header">
        <div className="container header-content">
          <Link to="/" className="logo">
            <span className="logo-text">AURA</span>
            <span className="logo-subtext">Platform</span>
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

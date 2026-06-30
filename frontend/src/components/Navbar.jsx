import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const Navbar = () => {
  const location = useLocation();
  const {
    auraRole,
    isAuthenticated,
    loading: authLoading,
    signOut,
    user,
  } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const canReview = ["reviewer", "admin"].includes(auraRole);
  const submitPath = isAuthenticated ? "/submit" : "/auth?next=/submit";
  const currentPath = `${location.pathname}${location.search}`;
  const signInPath =
    location.pathname === "/auth" ? "/auth" : `/auth?next=${encodeURIComponent(currentPath)}`;

  const navLinks = [
    { name: "Browse", path: "/" },
    { name: "Submit Artifact", path: submitPath, activePath: "/submit" },
    ...(canReview ? [{ name: "Review", path: "/admin", badge: true }] : []),
    ...(isAuthenticated
      ? [
          { name: "My Submissions", path: "/profile" },
        ]
      : []),
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const userEmail = user?.email || "Signed in";

  const handleSignOut = async () => {
    setAuthBusy(true);

    try {
      await signOut();
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Sign-out failed.", error);
    } finally {
      setAuthBusy(false);
    }
  };

  const AuthButton = ({ mobile = false }) => {
    if (authLoading) {
      return (
        <span
          className={
            mobile
              ? "block px-3 py-2 text-sm font-medium text-gray-400"
              : "hidden sm:inline-flex items-center text-sm font-medium text-gray-400"
          }
        >
          Checking session...
        </span>
      );
    }

    if (isAuthenticated) {
      return (
        <div
          className={
            mobile
              ? "space-y-2 px-3 py-2"
              : "hidden sm:flex items-center gap-3"
          }
        >
          <Link
            to="/profile"
            onClick={() => setIsMenuOpen(false)}
            className={
              mobile
                ? "block truncate text-sm font-medium text-gray-700"
                : "max-w-56 truncate text-sm font-medium text-gray-700 hover:text-brand-600"
            }
            title={userEmail}
          >
            {userEmail}
          </Link>
          <button
            className={
              mobile
                ? "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-50"
                : "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            }
            disabled={authBusy}
            onClick={handleSignOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      );
    }

    return (
      <Link
        className={
          mobile
            ? "mx-3 mb-2 w-[calc(100%-1.5rem)] rounded-lg bg-brand-600 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            : "hidden sm:inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        }
        onClick={() => setIsMenuOpen(false)}
        to={signInPath}
      >
        Sign in
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed w-full z-50 glass border-b border-gray-200 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/"
                className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md border border-gray-100">
                  <img
                    alt="OSIPI Logo"
                    className="h-full w-full object-contain"
                    src="/favicon.png"
                  />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">
                  OSIPI
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      location.pathname === (link.activePath || link.path)
                        ? "border-brand-500 text-brand-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {link.badge ? (
                      <span className="flex items-center gap-1.5">
                        {link.name}{" "}
                        <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
                      </span>
                    ) : (
                      link.name
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop Auth / Mobile Menu Button */}
            <div className="flex items-center space-x-4">
              <AuthButton />

              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={toggleMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 transition-colors"
                  aria-expanded="false"
                >
                  <span className="sr-only">Open main menu</span>
                  {isMenuOpen ? (
                    <i className="fas fa-times text-xl w-6 h-6 flex items-center justify-center"></i>
                  ) : (
                    <i className="fas fa-bars text-xl w-6 h-6 flex items-center justify-center"></i>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? "max-h-64 border-b border-gray-200" : "max-h-0"}`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white/80 backdrop-blur-md">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === (link.activePath || link.path)
                    ? "bg-brand-50 text-brand-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  {link.name}
                  {link.badge && (
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </div>
              </Link>
            ))}
            <AuthButton mobile />
          </div>
        </div>
      </nav>

    </>
  );
};

export default Navbar;

import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/useAuth";

const safeNextPath = (value) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  if (value === "/auth" || value.startsWith("/auth?")) {
    return "/";
  }
  return value;
};

function Auth() {
  const location = useLocation();
  const {
    isAuthenticated,
    isSupabaseConfigured,
    loading: authLoading,
    signInWithEmail,
    user,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSending, setIsSending] = useState(false);

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return safeNextPath(params.get("next"));
  }, [location.search]);

  useEffect(() => {
    if (!email && user?.email) {
      setEmail(user.email);
    }
  }, [email, user?.email]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email address.");
      return;
    }

    setIsSending(true);
    setError("");
    setNotice("");

    try {
      const redirectUrl = `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`;
      await signInWithEmail(trimmedEmail, redirectUrl);
      setNotice("Magic link sent. Check your email, then return here.");
    } catch (signInError) {
      setError(signInError.message || "Sign-in failed.");
    } finally {
      setIsSending(false);
    }
  };

  if (!authLoading && isAuthenticated) {
    return <Navigate replace to={nextPath} />;
  }

  return (
    <div className="animate-fade-in mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center">
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Sign in to AURA</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Use your email to receive a secure magic link.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            Sign-in is not configured for this environment.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {notice}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="auth-email">
              Email
            </label>
            <input
              autoComplete="email"
              autoFocus
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              id="auth-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          <button
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={authLoading || isSending || !isSupabaseConfigured}
            type="submit"
          >
            {isSending ? "Sending..." : "Send magic link"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <Link className="font-medium text-gray-500 hover:text-gray-700" to="/">
            Back to browse
          </Link>
          {nextPath !== "/" && (
            <span className="truncate text-xs text-gray-400" title={nextPath}>
              After sign-in: {nextPath}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;

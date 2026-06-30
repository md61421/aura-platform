import { Link, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./useAuth";

const ROLE_LABELS = {
  admin: "Admin",
  contributor: "Contributor",
  public_user: "Public user",
  reviewer: "Reviewer",
};

function AccessPanel({ title, message, action }) {
  return (
    <div className="animate-fade-in mx-auto max-w-2xl py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <i className="fas fa-lock"></i>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">{message}</p>
        {action}
      </div>
    </div>
  );
}

export function RequireRole({ allowedRoles, children }) {
  const location = useLocation();
  const {
    auraRole,
    auraUserError,
    auraUserLoading,
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading || auraUserLoading) {
    return (
      <AccessPanel
        title="Checking access"
        message="Confirming your AURA role before opening this workspace."
      />
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate replace to={`/auth?next=${next}`} />;
  }

  if (auraUserError) {
    return (
      <AccessPanel
        title="Could not verify role"
        message={auraUserError}
      />
    );
  }

  if (!allowedRoles.includes(auraRole)) {
    const roleLabel = ROLE_LABELS[auraRole] || "Unassigned";

    return (
      <AccessPanel
        title="Reviewer access required"
        message={`Your current role is ${roleLabel}. Ask an admin to upgrade your role if you need review access.`}
        action={
          <Link
            className="mt-6 inline-flex rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            to="/"
          >
            Back to browse
          </Link>
        }
      />
    );
  }

  return children;
}

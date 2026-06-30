import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { fetchMySubmissions } from "../services/api";

const STATUS_META = {
  approved: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Approved",
  },
  needs_changes: {
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "Needs Changes",
  },
  pending_review: {
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    label: "Pending Review",
  },
  rejected: {
    className: "bg-red-50 text-red-700 ring-red-200",
    label: "Rejected",
  },
  withdrawn: {
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    label: "Withdrawn",
  },
};

const ARTIFACT_STATUS_META = {
  archived: "Archived",
  community_published: "Community Published",
  draft: "Draft",
  flagged: "Flagged",
  osipi_verified: "OSIPI Verified",
  rejected: "Rejected",
};

const publicArtifactStatuses = new Set(["community_published", "osipi_verified", "approved"]);

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const statusMeta = (status) =>
  STATUS_META[status] || {
    className: "bg-gray-50 text-gray-700 ring-gray-200",
    label: status || "Unknown",
  };

function StatusBadge({ status }) {
  const meta = statusMeta(status);

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function StatTile({ label, value, tone = "text-gray-900" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <i className="fas fa-upload"></i>
      </div>
      <h3 className="text-lg font-bold text-gray-900">No submissions yet</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
        Your submitted artifacts will appear here after you publish them.
      </p>
      <Link
        className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700"
        to="/submit"
      >
        Submit artifact
      </Link>
    </div>
  );
}

const Profile = () => {
  const {
    auraRole,
    auraUser,
    auraUserError,
    auraUserLoading,
    isAuthenticated,
    loading: authLoading,
    user,
  } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubmissions = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await fetchMySubmissions();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load your submissions.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !auraUserLoading) {
      loadSubmissions();
    }
  }, [authLoading, auraUserLoading, loadSubmissions]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const approved = submissions.filter((submission) => submission.status === "approved").length;
    const needsChanges = submissions.filter((submission) => submission.status === "needs_changes").length;
    const rejected = submissions.filter((submission) => submission.status === "rejected").length;

    return {
      approved,
      needsChanges,
      rejected,
      total,
    };
  }, [submissions]);

  if (authLoading || auraUserLoading) {
    return (
      <div className="animate-fade-in mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500"></div>
          <h1 className="text-xl font-bold text-gray-900">Loading account</h1>
          <p className="mt-2 text-sm text-gray-500">Preparing your submissions.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/auth?next=/profile" />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">My Submissions</h2>
          <p className="text-gray-500">Track artifacts published from your AURA account.</p>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center">
          <span className="max-w-72 truncate text-sm font-semibold text-gray-800">
            {auraUser?.email || user?.email}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
            {auraRole || "contributor"}
          </span>
        </div>
      </div>

      {auraUserError && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          {auraUserError}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatTile label="Total" value={stats.total} />
        <StatTile label="Approved" tone="text-emerald-600" value={stats.approved} />
        <StatTile label="Needs Changes" tone="text-amber-500" value={stats.needsChanges} />
        <StatTile label="Rejected" tone="text-red-600" value={stats.rejected} />
      </div>

      <div className="mb-5 flex justify-end">
        <button
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={loadSubmissions}
          type="button"
        >
          <i className="fas fa-rotate-right mr-2"></i>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500"></div>
          <p className="font-semibold text-gray-700">Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Artifact</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Submission</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Artifact Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Files</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((submission) => {
                  const artifact = submission.artifact;
                  const title = artifact?.title || submission.image?.title || "Untitled artifact";
                  const canOpenArtifact = artifact && publicArtifactStatuses.has(artifact.status);

                  return (
                    <tr className="transition-colors hover:bg-gray-50/50" key={submission.id}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">
                          {canOpenArtifact ? (
                            <Link className="hover:text-brand-600" to={`/artifact/${artifact.id}`}>
                              {title}
                            </Link>
                          ) : (
                            title
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {artifact?.default_modality || submission.image?.modality || "UNKNOWN"}
                          {submission.image?.vendor ? ` · ${submission.image.vendor}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={submission.status} />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">
                        {ARTIFACT_STATUS_META[artifact?.status] || artifact?.status || "Not linked"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{submission.file_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(submission.submitted_at || submission.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

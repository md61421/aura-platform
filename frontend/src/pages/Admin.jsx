import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { fetchArtifacts, moderateArtifact } from "../services/api";

const ACTION_COPY = {
  archive: {
    button: "Archive",
    icon: "fa-box-archive",
    intent: "text-slate-600 hover:bg-slate-50",
    title: "Archive artifact",
  },
  flag: {
    button: "Flag",
    icon: "fa-flag",
    intent: "text-amber-600 hover:bg-amber-50",
    title: "Flag for changes",
  },
  reject: {
    button: "Reject",
    icon: "fa-times",
    intent: "text-red-600 hover:bg-red-50",
    title: "Reject artifact",
  },
  verify: {
    button: "Verify",
    icon: "fa-check",
    intent: "text-emerald-600 hover:bg-emerald-50",
    title: "Mark OSIPI verified",
  },
};

const STATUS_COPY = {
  community_published: {
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    label: "Community Published",
  },
  osipi_verified: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "OSIPI Verified",
  },
  approved: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Approved",
  },
  flagged: {
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "Flagged",
  },
  rejected: {
    className: "bg-red-50 text-red-700 ring-red-200",
    label: "Rejected",
  },
  archived: {
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    label: "Archived",
  },
};

const reviewableStatuses = new Set(["community_published"]);

const statusMeta = (status) =>
  STATUS_COPY[status] || {
    className: "bg-gray-50 text-gray-700 ring-gray-200",
    label: status || "Unknown",
  };

function StatusBadge({ status }) {
  const meta = statusMeta(status);

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <i className="fas fa-inbox"></i>
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{message}</p>
    </div>
  );
}

function ArtifactTable({ artifacts, auraRole, onAction }) {
  const isAdmin = auraRole === "admin";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Artifact</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Modality</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Tags</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {artifacts.map((artifact) => (
              <tr className="transition-colors hover:bg-gray-50/60" key={artifact.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-slate-400">
                      <i className="fas fa-brain"></i>
                    </div>
                    <div className="min-w-64">
                      <Link
                        className="font-bold text-gray-900 hover:text-brand-600"
                        to={`/artifact/${artifact.id}`}
                      >
                        {artifact.title}
                      </Link>
                      <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                        {artifact.visual_description || artifact.explanation || "No description provided."}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={artifact.backendStatus} />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-700">
                  {artifact.default_modality}
                </td>
                <td className="px-6 py-4">
                  <div className="flex max-w-xs flex-wrap gap-1.5">
                    {artifact.tags.length > 0 ? (
                      artifact.tags.slice(0, 3).map((tag) => (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500" key={tag}>
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">No tags</span>
                    )}
                    {artifact.tags.length > 3 && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                        +{artifact.tags.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {["verify", "flag", "reject"].map((action) => {
                      const copy = ACTION_COPY[action];
                      return (
                        <button
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${copy.intent}`}
                          key={action}
                          onClick={() => onAction(artifact, action)}
                          title={copy.title}
                          type="button"
                        >
                          <span className="sr-only">{copy.button}</span>
                          <i className={`fas ${copy.icon}`}></i>
                        </button>
                      );
                    })}
                    {isAdmin && (
                      <button
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${ACTION_COPY.archive.intent}`}
                        onClick={() => onAction(artifact, "archive")}
                        title={ACTION_COPY.archive.title}
                        type="button"
                      >
                        <span className="sr-only">Archive</span>
                        <i className={`fas ${ACTION_COPY.archive.icon}`}></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Admin = () => {
  const { auraRole } = useAuth();
  const [activeTab, setActiveTab] = useState("queue");
  const [artifacts, setArtifacts] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadArtifacts = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await fetchArtifacts({ limit: 100 });
      setArtifacts(data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load artifacts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArtifacts();
  }, []);

  const queueArtifacts = useMemo(
    () => artifacts.filter((artifact) => reviewableStatuses.has(artifact.backendStatus)),
    [artifacts],
  );

  const historyArtifacts = useMemo(
    () => artifacts.filter((artifact) => !reviewableStatuses.has(artifact.backendStatus)),
    [artifacts],
  );

  const displayedArtifacts = activeTab === "queue" ? queueArtifacts : historyArtifacts;

  const openAction = (artifact, action) => {
    setNotice("");
    setError("");
    setPendingAction({ action, artifact });
    setReviewNote("");
  };

  const closeAction = () => {
    if (submittingAction) {
      return;
    }
    setPendingAction(null);
    setReviewNote("");
  };

  const submitAction = async (event) => {
    event.preventDefault();
    if (!pendingAction) {
      return;
    }

    setSubmittingAction(true);
    setError("");
    setNotice("");

    try {
      const result = await moderateArtifact(
        pendingAction.artifact.id,
        pendingAction.action,
        reviewNote,
      );
      const nextStatus = statusMeta(result.artifact_status).label;
      setNotice(`${pendingAction.artifact.title} updated to ${nextStatus}.`);
      setPendingAction(null);
      setReviewNote("");
      await loadArtifacts();
    } catch (actionError) {
      setError(actionError.message || "Moderation action failed.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const pendingCopy = pendingAction ? ACTION_COPY[pendingAction.action] : null;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Moderation Queue</h2>
          <p className="text-gray-500">Review community-published artifacts and apply protected moderation actions.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600">
            Role: {auraRole}
          </span>
          <button
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={loadArtifacts}
            type="button"
          >
            <i className="fas fa-rotate-right mr-2"></i>
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            className={`rounded-lg px-4 py-2 text-sm transition-all ${activeTab === "queue" ? "bg-brand-50 font-semibold text-brand-600" : "text-gray-500 hover:text-gray-900"}`}
            onClick={() => setActiveTab("queue")}
            type="button"
          >
            Queue ({queueArtifacts.length})
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm transition-all ${activeTab === "history" ? "bg-brand-50 font-semibold text-brand-600" : "text-gray-500 hover:text-gray-900"}`}
            onClick={() => setActiveTab("history")}
            type="button"
          >
            Verified ({historyArtifacts.length})
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {auraRole === "admin"
            ? "Admins can verify, flag, reject, or archive."
            : "Reviewers can verify, flag, or reject."}
        </p>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500"></div>
          <p className="font-semibold text-gray-700">Loading moderation queue...</p>
        </div>
      ) : displayedArtifacts.length > 0 ? (
        <ArtifactTable artifacts={displayedArtifacts} auraRole={auraRole} onAction={openAction} />
      ) : activeTab === "queue" ? (
        <EmptyState
          title="Queue is clear"
          message="Community-published artifacts that need reviewer attention will appear here."
        />
      ) : (
        <EmptyState
          title="No verified artifacts yet"
          message="Artifacts you verify will move into this view after refresh."
        />
      )}

      {pendingAction && pendingCopy && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <form
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
            onSubmit={submitAction}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{pendingCopy.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{pendingAction.artifact.title}</p>
              </div>
              <button
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                disabled={submittingAction}
                onClick={closeAction}
                type="button"
              >
                <span className="sr-only">Close moderation dialog</span>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <label className="block text-sm font-semibold text-gray-700" htmlFor="review-note">
              Review note
            </label>
            <textarea
              className="mt-2 min-h-32 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              id="review-note"
              maxLength={2000}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Add context for contributors or other reviewers..."
              value={reviewNote}
            />
            <div className="mt-2 text-right text-xs text-gray-400">{reviewNote.length}/2000</div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submittingAction}
                onClick={closeAction}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submittingAction}
                type="submit"
              >
                {submittingAction ? "Saving..." : pendingCopy.button}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Admin;

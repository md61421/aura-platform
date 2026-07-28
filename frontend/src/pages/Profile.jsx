import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import {
  fetchMySubmissions,
  republishMySubmission,
  updateMySubmission,
  withdrawMySubmission,
} from "../services/api";

const STATUS_META = {
  approved: {
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    label: "Submitted",
  },
  needs_changes: {
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "Flagged",
  },
  pending_review: {
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    label: "Submitted",
  },
  rejected: {
    className: "bg-red-50 text-red-700 ring-red-200",
    label: "Removed",
  },
  withdrawn: {
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    label: "Withdrawn",
  },
};

const ARTIFACT_STATUS_META = {
  approved: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Live",
  },
  archived: {
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    label: "Archived",
  },
  contributor_published: {
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    label: "Live",
  },
  draft: {
    className: "bg-gray-50 text-gray-700 ring-gray-200",
    label: "Draft",
  },
  flagged: {
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "Flagged",
  },
  osipi_verified: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "OSIPI Verified",
  },
  rejected: {
    className: "bg-red-50 text-red-700 ring-red-200",
    label: "Removed",
  },
};

const publicArtifactStatuses = new Set(["contributor_published", "osipi_verified", "approved"]);
const editableArtifactStatuses = new Set(["approved", "contributor_published", "draft", "flagged", "osipi_verified"]);
const removableArtifactStatuses = new Set(["approved", "contributor_published", "flagged", "osipi_verified"]);
const republishableArtifactStatuses = new Set(["archived", "rejected"]);
const modalityOptions = ["ASL", "DSC", "DCE", "IVIM", "MULTI", "UNKNOWN"];
const fieldClass =
  "mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500";

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

const remediesToText = (remedies = []) => {
  if (!Array.isArray(remedies)) {
    return "";
  }

  return remedies
    .map((remedy) => {
      if (typeof remedy === "string") {
        return remedy;
      }
      return remedy?.text || remedy?.description || remedy?.value || "";
    })
    .filter(Boolean)
    .join("\n");
};

const splitTags = (value) =>
  String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const submissionToEditForm = (submission) => {
  const tags = Array.isArray(submission.artifact?.tags) ? submission.artifact.tags : [];
  const category = tags[0] || "Other";
  const symptoms = tags.slice(1).join(", ");

  return {
    artifactName: submission.artifact?.title || submission.image?.title || "",
    category,
    description:
      submission.artifact?.visual_description ||
      submission.artifact?.explanation ||
      submission.image?.caption ||
      "",
    fieldStrength: submission.image?.field_strength || "",
    modality: submission.artifact?.default_modality || submission.image?.modality || "UNKNOWN",
    protocol: submission.image?.protocol || "",
    remedies: remediesToText(submission.artifact?.remedies),
    scanner: submission.image?.vendor || "",
    sequence: submission.image?.sequence || "",
    symptoms,
  };
};

function StatusBadge({ status }) {
  const meta = statusMeta(status);

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function ArtifactStatusBadge({ status }) {
  const meta = ARTIFACT_STATUS_META[status] || {
    className: "bg-gray-50 text-gray-700 ring-gray-200",
    label: status || "Not linked",
  };

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
        Artifacts you publish to AURA will appear here.
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
  const [editSubmission, setEditSubmission] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [withdrawSubmission, setWithdrawSubmission] = useState(null);
  const [republishSubmission, setRepublishSubmission] = useState(null);
  const [actionError, setActionError] = useState("");
  const [isActionBusy, setIsActionBusy] = useState(false);

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
    const live = submissions.filter((submission) =>
      ["approved", "contributor_published"].includes(submission.artifact?.status)
    ).length;
    const verified = submissions.filter(
      (submission) => submission.artifact?.status === "osipi_verified"
    ).length;
    const flagged = submissions.filter(
      (submission) => submission.artifact?.status === "flagged"
    ).length;
    const removed = submissions.filter((submission) =>
      ["archived", "rejected"].includes(submission.artifact?.status)
    ).length;

    return {
      flagged,
      live,
      removed,
      total,
      verified,
    };
  }, [submissions]);

  const openEdit = (submission) => {
    setActionError("");
    setEditSubmission(submission);
    setEditForm(submissionToEditForm(submission));
  };

  const closeEdit = () => {
    if (isActionBusy) {
      return;
    }
    setEditSubmission(null);
    setEditForm(null);
    setActionError("");
  };

  const updateEditField = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const replaceSubmission = (nextSubmission) => {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === nextSubmission.id ? nextSubmission : submission
      )
    );
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editSubmission || !editForm) {
      return;
    }

    if (!editForm.artifactName.trim()) {
      setActionError("Artifact name is required.");
      return;
    }
    if (!editForm.category.trim()) {
      setActionError("Category is required.");
      return;
    }
    if (editForm.description.trim().length < 10) {
      setActionError("Add a description of at least 10 characters.");
      return;
    }

    setIsActionBusy(true);
    setActionError("");

    try {
      const updatedSubmission = await updateMySubmission(editSubmission.id, {
        ...editForm,
        symptoms: splitTags(editForm.symptoms),
      });
      replaceSubmission(updatedSubmission);
      setEditSubmission(null);
      setEditForm(null);
    } catch (saveError) {
      setActionError(saveError.message || "Unable to update this artifact.");
    } finally {
      setIsActionBusy(false);
    }
  };

  const openWithdraw = (submission) => {
    setActionError("");
    setWithdrawSubmission(submission);
  };

  const closeWithdraw = () => {
    if (isActionBusy) {
      return;
    }
    setWithdrawSubmission(null);
    setActionError("");
  };

  const confirmWithdraw = async () => {
    if (!withdrawSubmission) {
      return;
    }

    setIsActionBusy(true);
    setActionError("");

    try {
      const updatedSubmission = await withdrawMySubmission(withdrawSubmission.id);
      replaceSubmission(updatedSubmission);
      setWithdrawSubmission(null);
    } catch (withdrawError) {
      setActionError(withdrawError.message || "Unable to withdraw this artifact.");
    } finally {
      setIsActionBusy(false);
    }
  };

  const openRepublish = (submission) => {
    setActionError("");
    setRepublishSubmission(submission);
  };

  const closeRepublish = () => {
    if (isActionBusy) {
      return;
    }
    setRepublishSubmission(null);
    setActionError("");
  };

  const confirmRepublish = async () => {
    if (!republishSubmission) {
      return;
    }

    setIsActionBusy(true);
    setActionError("");

    try {
      const updatedSubmission = await republishMySubmission(republishSubmission.id);
      replaceSubmission(updatedSubmission);
      setRepublishSubmission(null);
    } catch (republishError) {
      setActionError(republishError.message || "Unable to republish this artifact.");
    } finally {
      setIsActionBusy(false);
    }
  };

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
          <p className="text-gray-500">Track artifacts you have published to AURA.</p>
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
        <StatTile label="Live" tone="text-blue-600" value={stats.live} />
        <StatTile label="Verified" tone="text-emerald-600" value={stats.verified} />
        <StatTile label="Flagged/Removed" tone="text-amber-600" value={stats.flagged + stats.removed} />
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
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Listing</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Submission</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Files</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Published</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((submission) => {
                  const artifact = submission.artifact;
                  const title = artifact?.title || submission.image?.title || "Untitled artifact";
                  const canOpenArtifact = artifact && publicArtifactStatuses.has(artifact.status);
                  const canEditArtifact = artifact && editableArtifactStatuses.has(artifact.status);
                  const canWithdrawArtifact = artifact && removableArtifactStatuses.has(artifact.status);
                  const canRepublishArtifact = artifact && (
                    republishableArtifactStatuses.has(artifact.status) || artifact.status === "draft"
                  );
                  const republishTitle = artifact?.status === "draft" ? "Publish draft" : "Republish artifact";

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
                        <ArtifactStatusBadge status={artifact?.status} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={submission.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{submission.file_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(submission.submitted_at || submission.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!canEditArtifact}
                            onClick={() => openEdit(submission)}
                            title="Edit artifact"
                            type="button"
                          >
                            <span className="sr-only">Edit</span>
                            <i className="fas fa-pen"></i>
                          </button>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!canRepublishArtifact}
                            onClick={() => openRepublish(submission)}
                            title={republishTitle}
                            type="button"
                          >
                            <span className="sr-only">{republishTitle}</span>
                            <i className="fas fa-arrow-rotate-left"></i>
                          </button>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!canWithdrawArtifact}
                            onClick={() => openWithdraw(submission)}
                            title="Remove from site"
                            type="button"
                          >
                            <span className="sr-only">Remove</span>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editSubmission && editForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-3 py-4 backdrop-blur-sm sm:px-4">
          <form
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onSubmit={submitEdit}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">Edit artifact</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Changes update the live contributor listing.
                </p>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                onClick={closeEdit}
                type="button"
              >
                <span className="sr-only">Close</span>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {actionError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-artifact-name">
                    Artifact name
                  </label>
                  <input
                    className={fieldClass}
                    id="edit-artifact-name"
                    maxLength="255"
                    name="artifactName"
                    onChange={updateEditField}
                    required
                    value={editForm.artifactName}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-modality">
                    Modality
                  </label>
                  <select
                    className={fieldClass}
                    id="edit-modality"
                    name="modality"
                    onChange={updateEditField}
                    value={editForm.modality}
                  >
                    {modalityOptions.map((modality) => (
                      <option key={modality} value={modality}>
                        {modality}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-category">
                    Category
                  </label>
                  <input
                    className={fieldClass}
                    id="edit-category"
                    maxLength="120"
                    name="category"
                    onChange={updateEditField}
                    required
                    value={editForm.category}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-scanner">
                    Scanner/vendor
                  </label>
                  <input
                    className={fieldClass}
                    id="edit-scanner"
                    maxLength="120"
                    name="scanner"
                    onChange={updateEditField}
                    value={editForm.scanner}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-sequence">
                    Sequence
                  </label>
                  <input
                    className={fieldClass}
                    id="edit-sequence"
                    maxLength="120"
                    name="sequence"
                    onChange={updateEditField}
                    value={editForm.sequence}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-protocol">
                    Protocol
                  </label>
                  <input
                    className={fieldClass}
                    id="edit-protocol"
                    maxLength="255"
                    name="protocol"
                    onChange={updateEditField}
                    value={editForm.protocol}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-field-strength">
                    Field strength
                  </label>
                  <input
                    className={fieldClass}
                    id="edit-field-strength"
                    maxLength="50"
                    name="fieldStrength"
                    onChange={updateEditField}
                    value={editForm.fieldStrength}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-symptoms">
                    Symptoms
                  </label>
                  <input
                    className={fieldClass}
                    id="edit-symptoms"
                    name="symptoms"
                    onChange={updateEditField}
                    placeholder="ghosting, ringing, distortion"
                    value={editForm.symptoms}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-description">
                    Description
                  </label>
                  <textarea
                    className={`${fieldClass} min-h-24 resize-y`}
                    id="edit-description"
                    name="description"
                    onChange={updateEditField}
                    required
                    value={editForm.description}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="edit-remedies">
                    Remedies
                  </label>
                  <textarea
                    className={`${fieldClass} min-h-20 resize-y`}
                    id="edit-remedies"
                    name="remedies"
                    onChange={updateEditField}
                    value={editForm.remedies}
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isActionBusy}
                onClick={closeEdit}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isActionBusy}
                type="submit"
              >
                {isActionBusy ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {withdrawSubmission && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <i className="fas fa-trash"></i>
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Withdraw this artifact?</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              This removes the artifact from public browse and detail pages. Your submission record stays visible here.
            </p>

            {actionError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isActionBusy}
                onClick={closeWithdraw}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isActionBusy}
                onClick={confirmWithdraw}
                type="button"
              >
                {isActionBusy ? "Withdrawing..." : "Withdraw artifact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {republishSubmission && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <i className="fas fa-arrow-rotate-left"></i>
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">
              {republishSubmission.artifact?.status === "draft"
                ? "Publish this draft?"
                : "Republish this artifact?"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {republishSubmission.artifact?.status === "draft"
                ? "This publishes the draft to the public site. Only image files are made public; NIfTI files remain private."
                : "This restores the artifact to the public site. Only image files are made public; NIfTI files remain private."}
            </p>

            {actionError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isActionBusy}
                onClick={closeRepublish}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isActionBusy}
                onClick={confirmRepublish}
                type="button"
              >
                {isActionBusy
                  ? republishSubmission.artifact?.status === "draft" ? "Publishing..." : "Republishing..."
                  : republishSubmission.artifact?.status === "draft" ? "Publish draft" : "Republish artifact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

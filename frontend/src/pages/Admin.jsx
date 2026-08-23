import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import {
  fetchArtifacts,
  moderateArtifact,
  fetchMetadataSchema,
  createMetadataField,
  updateMetadataField,
  deleteMetadataField,
} from "../services/api";

const ACTION_COPY = {
  archive: {
    button: "Archive",
    icon: "fa-box-archive",
    intent: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300",
    title: "Archive artifact",
  },
  flag: {
    button: "Flag",
    icon: "fa-flag",
    intent: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
    title: "Flag for changes",
  },
  reject: {
    button: "Reject",
    icon: "fa-times",
    intent: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
    title: "Reject artifact",
  },
  verify: {
    button: "Verify OSIPI",
    icon: "fa-check-double",
    intent: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
    title: "Mark OSIPI verified",
  },
};

const STATUS_COPY = {
  contributor_published: {
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    label: "Contributor Published",
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

const statusMeta = (status) =>
  STATUS_COPY[status] || {
    className: "bg-gray-50 text-gray-700 ring-gray-200",
    label: status || "Unknown",
  };

function StatusBadge({ status }) {
  const meta = statusMeta(status);

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <i className="fas fa-inbox text-xl"></i>
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{message}</p>
    </div>
  );
}

const INITIAL_MODALITY_SCHEMAS = {
  ASL: [],
  DSC: [],
  DCE: [],
  IVIM: [],
  MULTI: [],
  UNKNOWN: [],
};

const Admin = () => {
  const { auraRole, user } = useAuth();
  const isAdmin = auraRole === "admin";

  // Main Admin Section Tabs: "moderation" | "metadata" | "system"
  const [activeMainTab, setActiveMainTab] = useState("moderation");

  // Moderation Filter Sub-Tabs: "queue" | "verified" | "all"
  const [modSubTab, setModSubTab] = useState("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalityFilter, setModalityFilter] = useState("ALL");

  // Artifact Data State
  const [artifacts, setArtifacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Action Modal State
  const [pendingAction, setPendingAction] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Quick Artifact Inspection Drawer Modal
  const [inspectArtifact, setInspectArtifact] = useState(null);

  // Modality Metadata Schema Manager State
  const [selectedMetaModality, setSelectedMetaModality] = useState("ASL");
  const [modalitySchemas, setModalitySchemas] = useState(INITIAL_MODALITY_SCHEMAS);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldUnit, setNewFieldUnit] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [schemaNotice, setSchemaNotice] = useState("");

  // Editing Schema Field Modal State
  const [editingField, setEditingField] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editType, setEditType] = useState("text");
  const [editRequired, setEditRequired] = useState(false);

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

  const loadMetadataSchemas = async () => {
    try {
      const data = await fetchMetadataSchema();
      if (Array.isArray(data)) {
        const grouped = { ASL: [], DSC: [], DCE: [], IVIM: [] };
        data.forEach((item) => {
          const mod = item.modality;
          if (!grouped[mod]) grouped[mod] = [];
          grouped[mod].push({
            id: item.id,
            key: item.key,
            label: item.label,
            unit: item.unit || "",
            type: item.field_type || "text",
            required: !!item.is_required,
            example: item.example || "",
          });
        });
        setModalitySchemas(grouped);
      }
    } catch {
      // Keep initial schemas fallback
    }
  };

  useEffect(() => {
    loadArtifacts();
    loadMetadataSchemas();
  }, []);

  // Compute Platform Metrics
  const metrics = useMemo(() => {
    const total = artifacts.length;
    const pending = artifacts.filter((a) => a.backendStatus === "contributor_published").length;
    const verified = artifacts.filter((a) => a.backendStatus === "osipi_verified" || a.backendStatus === "approved").length;
    const flagged = artifacts.filter((a) => a.backendStatus === "flagged").length;
    return { total, pending, verified, flagged };
  }, [artifacts]);

  // Filtered Artifacts for Moderation Queue Table
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((artifact) => {
      // Sub-tab status filter
      if (modSubTab === "queue" && artifact.backendStatus !== "contributor_published") {
        return false;
      }
      if (
        modSubTab === "verified" &&
        artifact.backendStatus !== "osipi_verified" &&
        artifact.backendStatus !== "approved"
      ) {
        return false;
      }

      // Modality filter
      if (modalityFilter !== "ALL" && artifact.default_modality !== modalityFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = artifact.title.toLowerCase().includes(q);
        const descMatch = (artifact.visual_description || artifact.explanation || "").toLowerCase().includes(q);
        const tagMatch = artifact.tags.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });
  }, [artifacts, modSubTab, modalityFilter, searchQuery]);

  const openAction = (artifact, action) => {
    setNotice("");
    setError("");
    setPendingAction({ action, artifact });
    setReviewNote("");
  };

  const closeAction = () => {
    if (submittingAction) return;
    setPendingAction(null);
    setReviewNote("");
  };

  const submitAction = async (event) => {
    event.preventDefault();
    if (!pendingAction) return;

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
      setNotice(`"${pendingAction.artifact.title}" status updated to ${nextStatus}.`);
      setPendingAction(null);
      setReviewNote("");
      await loadArtifacts();
    } catch (actionError) {
      setError(actionError.message || "Moderation action failed.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Schema Manager Handlers
  const handleAddField = async (e) => {
    e.preventDefault();
    setSchemaNotice("");

    const label = newFieldLabel.trim();
    if (!label) {
      setSchemaNotice("Please enter a field label (e.g. TE, PLD, Readout).");
      return;
    }

    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const currentFields = modalitySchemas[selectedMetaModality] || [];
    if (currentFields.some((f) => f.key === key)) {
      setSchemaNotice(`Field "${label}" already exists for ${selectedMetaModality}.`);
      return;
    }

    try {
      await createMetadataField({
        modality: selectedMetaModality,
        key,
        label,
        unit: newFieldUnit.trim() || null,
        field_type: newFieldType,
        is_required: newFieldRequired,
      });

      setNewFieldLabel("");
      setNewFieldUnit("");
      setNewFieldType("text");
      setNewFieldRequired(false);
      setSchemaNotice(`Successfully saved "${label}" to ${selectedMetaModality} metadata schema.`);
      await loadMetadataSchemas();
    } catch (err) {
      setSchemaNotice(err.message || `Failed to save "${label}" field.`);
    }
  };

  const handleDeleteField = async (keyToDelete) => {
    const targetField = (modalitySchemas[selectedMetaModality] || []).find((f) => f.key === keyToDelete);
    if (targetField?.id) {
      try {
        await deleteMetadataField(targetField.id);
        setSchemaNotice(`Removed "${targetField?.label || keyToDelete}" from ${selectedMetaModality} metadata schema.`);
        await loadMetadataSchemas();
      } catch (err) {
        setSchemaNotice(err.message || "Failed to delete field.");
      }
    } else {
      setModalitySchemas((prev) => ({
        ...prev,
        [selectedMetaModality]: (prev[selectedMetaModality] || []).filter((f) => f.key !== keyToDelete),
      }));
      setSchemaNotice(`Removed "${targetField?.label || keyToDelete}" from ${selectedMetaModality} metadata schema.`);
    }
  };

  const startEditField = (field) => {
    setEditingField(field);
    setEditLabel(field.label);
    setEditUnit(field.unit || "");
    setEditType(field.type || "text");
    setEditRequired(!!field.required);
  };

  const handleSaveEditField = async (e) => {
    e.preventDefault();
    if (!editingField) return;

    const label = editLabel.trim();
    if (!label) {
      setSchemaNotice("Please enter a valid field label.");
      return;
    }

    if (editingField.id) {
      try {
        await updateMetadataField(editingField.id, {
          label,
          unit: editUnit.trim() || null,
          field_type: editType,
          is_required: editRequired,
        });
        setSchemaNotice(`Updated field "${label}" in ${selectedMetaModality} metadata schema.`);
        setEditingField(null);
        await loadMetadataSchemas();
      } catch (err) {
        setSchemaNotice(err.message || "Failed to update field.");
      }
    } else {
      setModalitySchemas((prev) => ({
        ...prev,
        [selectedMetaModality]: (prev[selectedMetaModality] || []).map((f) => {
          if (f.key === editingField.key) {
            return {
              ...f,
              label,
              unit: editUnit.trim(),
              type: editType,
              required: editRequired,
            };
          }
          return f;
        }),
      }));
      setSchemaNotice(`Updated field "${label}" in ${selectedMetaModality} metadata schema.`);
      setEditingField(null);
    }
  };

  const pendingCopy = pendingAction ? ACTION_COPY[pendingAction.action] : null;

  return (
    <div className="animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="mb-8 rounded-3xl  bg-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300 ring-1 ring-brand-400/30">
                <i className="fas fa-shield-halved"></i> Control Panel
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                <i className="fas fa-circle text-[8px] animate-pulse"></i> API Active
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Admin Panel
            </h1>
            <p className="mt-1 text-slate-300 text-sm sm:text-base max-w-2xl">
              Central administrative dashboard to review contributor submissions, configure modality metadata schemas, and manage platform governance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 backdrop-blur-sm">
              <div className="text-xs text-slate-400 font-medium">Logged in as</div>
              <div className="text-sm font-bold text-slate-100">{user?.email || "Admin User"}</div>
              <div className="mt-0.5 inline-block rounded bg-brand-500/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-200">
                Role: {auraRole}
              </div>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-all border border-white/10 disabled:opacity-60"
              disabled={isLoading}
              onClick={loadArtifacts}
              type="button"
            >
              <i className={`fas fa-rotate-right ${isLoading ? "animate-spin" : ""}`}></i>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
              <i className="fas fa-clock text-amber-400"></i>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-300">{metrics.pending}</div>
            <div className="mt-1 text-xs text-slate-400">Needs moderation</div>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">OSIPI Verified</span>
              <i className="fas fa-award text-emerald-400"></i>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-300">{metrics.verified}</div>
            <div className="mt-1 text-xs text-slate-400">Official badges</div>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Artifacts</span>
              <i className="fas fa-layer-group text-brand-400"></i>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-brand-300">{metrics.total}</div>
            <div className="mt-1 text-xs text-slate-400">Catalog items</div>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Modalities</span>
              <i className="fas fa-sliders text-purple-400"></i>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-purple-300">4</div>
            <div className="mt-1 text-xs text-slate-400">ASL, DSC, DCE, IVIM</div>
          </div>
        </div>
      </div>

      {/* Main Admin Tab Navigation Bar */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Admin Navigation Tabs">
          <button
            onClick={() => setActiveMainTab("moderation")}
            className={`inline-flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-extrabold transition-all ${
              activeMainTab === "moderation"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
            type="button"
          >
            <i className="fas fa-tasks text-base"></i>
            Artifact Moderation Queue
            {metrics.pending > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                {metrics.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMainTab("metadata")}
            className={`inline-flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-extrabold transition-all ${
              activeMainTab === "metadata"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
            type="button"
          >
            <i className="fas fa-sliders text-base"></i>
            Modality Metadata Manager
          </button>
        </nav>
      </div>

      {/* Global Notices */}
      {notice && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2">
            <i className="fas fa-circle-check text-emerald-600 text-lg"></i>
            {notice}
          </div>
          <button onClick={() => setNotice("")} className="text-emerald-600 hover:text-emerald-900" type="button">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-sm">
          <div className="flex items-center gap-2">
            <i className="fas fa-triangle-exclamation text-red-600 text-lg"></i>
            {error}
          </div>
          <button onClick={() => setError("")} className="text-red-600 hover:text-red-900" type="button">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* SECTION 1: MODERATION QUEUE PANEL */}
      {activeMainTab === "moderation" && (
        <div className="space-y-6">
          {/* Sub-Filters Bar */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-fit rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              <button
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  modSubTab === "queue" ? "bg-brand-50 text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setModSubTab("queue")}
                type="button"
              >
                Pending Queue ({metrics.pending})
              </button>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  modSubTab === "verified" ? "bg-brand-50 text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setModSubTab("verified")}
                type="button"
              >
                OSIPI Verified ({metrics.verified})
              </button>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  modSubTab === "all" ? "bg-brand-50 text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setModSubTab("all")}
                type="button"
              >
                All Artifacts ({artifacts.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-64">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Filter queue by title or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Modality Filter Dropdown */}
              <select
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="ALL">All Modalities</option>
                <option value="ASL">ASL</option>
                <option value="DSC">DSC</option>
                <option value="DCE">DCE</option>
                <option value="IVIM">IVIM</option>
              </select>
            </div>
          </div>

          {/* Artifacts Table */}
          {isLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-3 border-gray-200 border-t-brand-600"></div>
              <p className="font-bold text-gray-700">Loading moderation records...</p>
            </div>
          ) : filteredArtifacts.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Artifact Title & Summary</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Modality</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Tags</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredArtifacts.map((artifact) => (
                      <tr className="transition-colors hover:bg-gray-50/80" key={artifact.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-300 shadow-sm">
                              <i className="fas fa-brain text-lg"></i>
                            </div>
                            <div className="min-w-64">
                              <div className="flex items-center gap-2">
                                <Link
                                  className="font-bold text-gray-900 hover:text-brand-600 text-base"
                                  to={`/artifact/${artifact.id}`}
                                >
                                  {artifact.title}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setInspectArtifact(artifact)}
                                  className="text-xs text-gray-400 hover:text-gray-600"
                                  title="Quick Inspection"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                              </div>
                              <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                                {artifact.visual_description || artifact.explanation || "No description provided."}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={artifact.backendStatus} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {artifact.default_modality || "ASL"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {artifact.tags.length > 0 ? (
                              artifact.tags.slice(0, 3).map((tag) => (
                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600" key={tag}>
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">No tags</span>
                            )}
                            {artifact.tags.length > 3 && (
                              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                                +{artifact.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${ACTION_COPY.verify.intent}`}
                              onClick={() => openAction(artifact, "verify")}
                              title={ACTION_COPY.verify.title}
                              type="button"
                            >
                              <i className={`fas ${ACTION_COPY.verify.icon}`}></i>
                              Verify
                            </button>

                            <button
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${ACTION_COPY.flag.intent}`}
                              onClick={() => openAction(artifact, "flag")}
                              title={ACTION_COPY.flag.title}
                              type="button"
                            >
                              <i className={`fas ${ACTION_COPY.flag.icon}`}></i>
                              Flag
                            </button>

                            <button
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${ACTION_COPY.reject.intent}`}
                              onClick={() => openAction(artifact, "reject")}
                              title={ACTION_COPY.reject.title}
                              type="button"
                            >
                              <i className={`fas ${ACTION_COPY.reject.icon}`}></i>
                              Reject
                            </button>

                            {isAdmin && (
                              <button
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${ACTION_COPY.archive.intent}`}
                                onClick={() => openAction(artifact, "archive")}
                                title={ACTION_COPY.archive.title}
                                type="button"
                              >
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
          ) : (
            <EmptyState
              title="No records found"
              message="No artifacts match your selected filter criteria. Try adjusting your search query or modality dropdown."
            />
          )}
        </div>
      )}

      {/* SECTION 2: MODALITY METADATA SCHEMA MANAGER PANEL */}
      {activeMainTab === "metadata" && (
        <div className="space-y-8 animate-fade-in">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
              <div>
                <h3 className="text-xl font-black text-gray-900">Modality Technique Metadata Schema</h3>
                <p className="text-sm text-gray-500">
                  Configure, edit, and manage technique parameter definitions per modality.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {["ASL", "DSC", "DCE", "IVIM"].map((mod) => (
                  <button
                    key={mod}
                    onClick={() => setSelectedMetaModality(mod)}
                    className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${
                      selectedMetaModality === mod
                        ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    type="button"
                  >
                    {mod}
                  </button>
                ))}
              </div>
            </div>

            {schemaNotice && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-sm font-semibold text-blue-800 shadow-sm">
                <div className="flex items-center gap-2">
                  <i className="fas fa-info-circle text-blue-600"></i>
                  {schemaNotice}
                </div>
                <button onClick={() => setSchemaNotice("")} className="text-blue-600 hover:text-blue-900" type="button">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Existing Fields List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
                    Configured {selectedMetaModality} Fields ({modalitySchemas[selectedMetaModality]?.length || 0})
                  </h4>
                  <span className="text-xs text-gray-400 font-medium">Stored as JSONB in `modality_metadata`</span>
                </div>

                <div className="space-y-3">
                  {(modalitySchemas[selectedMetaModality] || []).length > 0 ? (
                    modalitySchemas[selectedMetaModality].map((field, idx) => (
                      <div
                        key={field.key}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-all hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">
                              {field.label} {field.unit ? <span className="text-gray-500 text-xs font-normal">({field.unit})</span> : ""}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              key: {field.key} | type: {field.type}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {field.required ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                              Required
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-600">
                              Optional
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => startEditField(field)}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 hover:text-brand-600 transition-colors shadow-sm"
                            title="Edit field definition"
                          >
                            <i className="fas fa-pen-to-square mr-1"></i> Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteField(field.key)}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                            title="Remove field from schema"
                          >
                            <i className="fas fa-trash-can mr-1"></i> Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title={`No ${selectedMetaModality} fields configured`}
                      message="Add field definitions using the form on the right."
                    />
                  )}
                </div>
              </div>

              {/* Add New Field Form */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-inner">
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-gray-800 mb-3">
                  Add Metadata Field to {selectedMetaModality}
                </h4>

                <form onSubmit={handleAddField} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Field Label *</label>
                    <input
                      type="text"
                      placeholder="e.g. TE, PLD, Flip Angle"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Unit (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. ms, s, deg, mL/s"
                      value={newFieldUnit}
                      onChange={(e) => setNewFieldUnit(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Data Type</label>
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="text">Text / String</option>
                      <option value="number">Number / Numeric</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="req-check"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <label htmlFor="req-check" className="text-xs font-bold text-gray-700 cursor-pointer">
                      Mark field as Required on Submissions
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-700 transition-all"
                  >
                    <i className="fas fa-plus mr-1.5"></i> Add Field Definition
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* MODAL 1: MODERATION ACTION DIALOG */}
      {pendingAction && pendingCopy && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <form
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in"
            onSubmit={submitAction}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{pendingCopy.title}</h3>
                <p className="mt-1 text-sm font-semibold text-brand-600">{pendingAction.artifact.title}</p>
              </div>
              <button
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                disabled={submittingAction}
                onClick={closeAction}
                type="button"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <label className="block text-sm font-semibold text-gray-700" htmlFor="review-note">
              Review Note / Moderation Feedback
            </label>
            <textarea
              className="mt-2 min-h-32 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none"
              id="review-note"
              maxLength={2000}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Add context for submitter or other reviewers..."
              value={reviewNote}
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                disabled={submittingAction}
                onClick={closeAction}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 disabled:opacity-60"
                disabled={submittingAction}
                type="submit"
              >
                {submittingAction ? "Saving..." : pendingCopy.button}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: QUICK ARTIFACT INSPECTION DRAWER */}
      {inspectArtifact && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Quick Inspection</span>
                <h3 className="text-xl font-extrabold text-gray-900">{inspectArtifact.title}</h3>
              </div>
              <button
                onClick={() => setInspectArtifact(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="font-bold text-gray-700 block mb-1">Visual Description:</span>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {inspectArtifact.visual_description || "No visual description provided."}
                </p>
              </div>

              <div>
                <span className="font-bold text-gray-700 block mb-1">Explanation:</span>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {inspectArtifact.explanation || "No explanation provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-gray-700 block">Modality:</span>
                  <span className="text-gray-900">{inspectArtifact.default_modality}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-700 block">Current Status:</span>
                  <StatusBadge status={inspectArtifact.backendStatus} />
                </div>
              </div>

              {inspectArtifact.modality_metadata && Object.keys(inspectArtifact.modality_metadata).length > 0 && (
                <div>
                  <span className="font-bold text-gray-700 block mb-1.5">Acquisition Technique Parameters:</span>
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                    {Object.entries(inspectArtifact.modality_metadata).map(([k, v]) => (
                      <div key={k} className="bg-white p-2 rounded-lg border border-gray-100">
                        <span className="text-gray-500 font-medium block capitalize">{k.replace(/_/g, " ")}:</span>
                        <span className="font-bold text-gray-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Link
                to={`/artifact/${inspectArtifact.id}`}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-brand-700"
              >
                View Full Page <i className="fas fa-arrow-right ml-1"></i>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT METADATA SCHEMA FIELD MODAL */}
      {editingField && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEditField}
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in"
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                  Edit Field Definition ({selectedMetaModality})
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  Edit {editingField.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Field Label *</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Unit (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ms, s, deg, mL/s"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Data Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="text">Text / String</option>
                  <option value="number">Number / Numeric</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-req-check"
                  checked={editRequired}
                  onChange={(e) => setEditRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="edit-req-check" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Mark field as Required on Submissions
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-brand-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Admin;

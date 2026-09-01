import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import {
  fetchArtifacts,
  fetchMetadataSchema,
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
  "mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 transition-colors";

const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg"];

const isSupportedUpload = (file) => {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
};

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

const parseSubmitterNotes = (raw) => {
  if (!raw) {
    return {
      category: "",
      modalityMetadata: {},
      references: "",
      sliceMetadata: [],
      submitterNotes: "",
      symptoms: [],
    };
  }
  try {
    const data = JSON.parse(raw);
    return {
      category: data.category || "",
      modalityMetadata: data.modality_metadata || {},
      references: Array.isArray(data.references) ? data.references.join("\n") : data.references || "",
      sliceMetadata: Array.isArray(data.slice_metadata) ? data.slice_metadata : [],
      submitterNotes: data.submitter_notes || "",
      symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
    };
  } catch {
    return {
      category: "",
      modalityMetadata: {},
      references: "",
      sliceMetadata: [],
      submitterNotes: raw,
      symptoms: [],
    };
  }
};

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + (sizes[i] || "B");
};

const formatSliceSize = (slice) => {
  if (slice.file?.size) return formatFileSize(slice.file.size);
  if (slice.file_size_mb !== undefined && slice.file_size_mb !== null && slice.file_size_mb > 0) {
    return `${slice.file_size_mb} MB`;
  }
  return "Image slice";
};

const submissionToEditForm = (submission) => {
  const parsed = parseSubmitterNotes(submission.submitter_notes);
  const tags = Array.isArray(submission.artifact?.tags) ? submission.artifact.tags : [];
  const symptoms = parsed.symptoms.length > 0 ? parsed.symptoms : tags;

  const existingFiles = Array.isArray(submission.image?.files) ? submission.image.files : [];
  const repFiles = existingFiles.filter(
    (f) =>
      f.file_role === "primary_representative" ||
      f.file_role === "representative" ||
      !f.file_role ||
      f.file_role === "thumbnail" ||
      f.file_role === "other",
  );

  const axialMontage = existingFiles.find((f) => f.file_role === "axial_montage");
  const coronalMontage = existingFiles.find((f) => f.file_role === "coronal_montage");
  const sagittalMontage = existingFiles.find((f) => f.file_role === "sagittal_montage");

  const sliceMetaList = parsed.sliceMetadata || [];
  const hasSavedMeta = Array.isArray(sliceMetaList) && sliceMetaList.length > 0;

  const mappedExistingSlices = repFiles.map((f, index) => {
    const urlFilename = String(f.public_url ? f.public_url.split("/").pop() : "").split("?")[0].toLowerCase();
    const sliceMeta = sliceMetaList.find((sm) => {
      if (!sm) return false;
      if (sm.id && f.id && String(sm.id) === String(f.id)) return true;
      if (sm.public_url && f.public_url && sm.public_url === f.public_url) return true;
      if (sm.filename) {
        const metaName = String(sm.filename).toLowerCase();
        if (f.filename && String(f.filename).toLowerCase() === metaName) return true;
        if (urlFilename && (urlFilename.endsWith(metaName) || metaName.endsWith(urlFilename) || urlFilename.includes(metaName))) return true;
      }
      return false;
    }) || (sliceMetaList[index] && !sliceMetaList[index].id ? sliceMetaList[index] : null);

    const isKey = hasSavedMeta
      ? Boolean(sliceMeta?.isKey || sliceMeta?.is_key || sliceMeta?.isPriority || sliceMeta?.is_priority || sliceMeta?.is_key_slice)
      : f.file_role === "primary_representative";

    const plane = (sliceMeta?.plane || sliceMeta?.view || "axial").toLowerCase();
    const sortIndex = sliceMeta?.index !== undefined ? Number(sliceMeta.index) : index;

    return {
      file_role: f.file_role,
      file_size_mb: f.file_size_mb,
      filename: sliceMeta?.filename || f.filename || `slice_${index + 1}.png`,
      id: f.id,
      isExisting: true,
      isKey,
      plane: ["axial", "coronal", "sagittal"].includes(plane) ? plane : "axial",
      previewUrl: f.public_url,
      public_url: f.public_url,
      sortIndex,
    };
  });

  mappedExistingSlices.sort((a, b) => a.sortIndex - b.sortIndex);

  const primaryFile = mappedExistingSlices.find((s) => s.isKey) || mappedExistingSlices[0] || null;

  return {
    artifactName: submission.artifact?.title || submission.image?.title || "",
    axialMontageFile: null,
    coronalMontageFile: null,
    deletedFileIds: [],
    description:
      submission.artifact?.visual_description ||
      submission.artifact?.explanation ||
      submission.image?.caption ||
      "",
    existingAxialMontage: axialMontage || null,
    existingCoronalMontage: coronalMontage || null,
    existingSagittalMontage: sagittalMontage || null,
    existingSlices: mappedExistingSlices,
    fieldStrength: submission.image?.field_strength || "",
    modality: submission.artifact?.default_modality || submission.image?.modality || "ASL",
    modalityMetadata: {
      ...(submission.image?.modality_metadata || {}),
      ...(parsed.modalityMetadata || {}),
    },
    newSlices: [],
    primaryFileId: primaryFile?.id || null,
    protocol: submission.image?.protocol || "",
    pseudonymisationConfirmed: true,
    remedies: remediesToText(submission.artifact?.remedies),
    references: parsed.references || "",
    sagittalMontageFile: null,
    scanner: submission.image?.vendor || "",
    sequence: submission.image?.sequence || "",
    submitterNotes: parsed.submitterNotes || "",
    symptoms: symptoms,
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
  const [editTab, setEditTab] = useState("details");
  const [activeViewTab, setActiveViewTab] = useState("axial");
  const [uploadTargetView, setUploadTargetView] = useState("axial");
  const [previewSliceId, setPreviewSliceId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [draggedSliceId, setDraggedSliceId] = useState(null);
  const [dragOverSliceId, setDragOverSliceId] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [modalitySchemaFields, setModalitySchemaFields] = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [existingArtifacts, setExistingArtifacts] = useState([]);
  const [showScannerSuggestions, setShowScannerSuggestions] = useState(false);
  const [showSequenceSuggestions, setShowSequenceSuggestions] = useState(false);
  const [withdrawSubmission, setWithdrawSubmission] = useState(null);
  const [republishSubmission, setRepublishSubmission] = useState(null);
  const [actionError, setActionError] = useState("");
  const [isActionBusy, setIsActionBusy] = useState(false);

  const fileInputRef = useRef(null);
  const scannerDropdownRef = useRef(null);
  const sequenceDropdownRef = useRef(null);

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

  useEffect(() => {
    let isMounted = true;
    fetchArtifacts({ limit: 100 })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setExistingArtifacts(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load artifacts for suggestions:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!editForm?.modality) {
      setModalitySchemaFields([]);
      return undefined;
    }

    let isMounted = true;
    setLoadingSchema(true);
    fetchMetadataSchema(editForm.modality)
      .then((data) => {
        if (isMounted) {
          const fields = Array.isArray(data) ? data : (data?.fields || []);
          const filtered = fields.filter(
            (f) => !f.modality || f.modality === editForm.modality || f.modality === "ALL"
          );
          setModalitySchemaFields(filtered);
        }
      })
      .catch((err) => {
        console.error("Failed to load modality metadata schema:", err);
        if (isMounted) setModalitySchemaFields([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSchema(false);
      });

    return () => {
      isMounted = false;
    };
  }, [editForm?.modality]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (scannerDropdownRef.current && !scannerDropdownRef.current.contains(event.target)) {
        setShowScannerSuggestions(false);
      }
      if (sequenceDropdownRef.current && !sequenceDropdownRef.current.contains(event.target)) {
        setShowSequenceSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const scannerSuggestions = useMemo(() => {
    const set = new Set();
    existingArtifacts.forEach((art) => {
      if (art.vendor && typeof art.vendor === "string" && art.vendor.trim()) {
        set.add(art.vendor.trim());
      }
      if (art.scanner && typeof art.scanner === "string" && art.scanner.trim()) {
        set.add(art.scanner.trim());
      }
    });
    ["Siemens Healthineers", "GE Healthcare", "Philips Healthcare", "Canon Medical Systems"].forEach(
      (v) => set.add(v),
    );
    return Array.from(set).sort();
  }, [existingArtifacts]);

  const sequenceSuggestions = useMemo(() => {
    const set = new Set();
    existingArtifacts.forEach((art) => {
      if (art.sequence && typeof art.sequence === "string" && art.sequence.trim()) {
        set.add(art.sequence.trim());
      }
    });
    [
      "3D GRASE",
      "2D EPI",
      "3D FSE",
      "2D FSE",
      "FAIR-EPI",
      "PCASL-GRASE",
      "PASL-EPI",
      "T1-weighted DCE",
      "T2*-weighted DSC",
      "Multi-b IVIM DWI",
    ].forEach((s) => set.add(s));
    return Array.from(set).sort();
  }, [existingArtifacts]);

  const filteredScannerSuggestions = editForm?.scanner?.trim()
    ? scannerSuggestions.filter((item) =>
        item.toLowerCase().includes(editForm.scanner.trim().toLowerCase()),
      )
    : scannerSuggestions;

  const filteredSequenceSuggestions = editForm?.sequence?.trim()
    ? sequenceSuggestions.filter((item) =>
        item.toLowerCase().includes(editForm.sequence.trim().toLowerCase()),
      )
    : sequenceSuggestions;

  const stats = useMemo(() => {
    const total = submissions.length;
    const live = submissions.filter((submission) =>
      ["approved", "contributor_published"].includes(submission.artifact?.status),
    ).length;
    const verified = submissions.filter(
      (submission) => submission.artifact?.status === "osipi_verified",
    ).length;
    const flagged = submissions.filter(
      (submission) => submission.artifact?.status === "flagged",
    ).length;
    const removed = submissions.filter((submission) =>
      ["archived", "rejected"].includes(submission.artifact?.status),
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
    setEditTab("details");
    setActiveViewTab("axial");
    setUploadTargetView("axial");
    setPreviewSliceId(null);
    setDraggedSliceId(null);
    setDragOverSliceId(null);
    setDragActive(false);
    setTagInput("");
  };

  const closeEdit = () => {
    if (isActionBusy) {
      return;
    }
    if (editForm?.newSlices) {
      editForm.newSlices.forEach((s) => {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      });
    }
    setEditSubmission(null);
    setEditForm(null);
    setPreviewSliceId(null);
    setActionError("");
  };

  const allSlices = useMemo(() => {
    if (!editForm) return [];
    return [...(editForm.existingSlices || []), ...(editForm.newSlices || [])];
  }, [editForm]);

  const activeViewSlices = useMemo(() => {
    return allSlices.filter((s) => (s.plane || "axial").toLowerCase() === activeViewTab);
  }, [allSlices, activeViewTab]);

  const modalSlice = useMemo(() => {
    if (!previewSliceId) return null;
    return allSlices.find((s) => s.id === previewSliceId) || null;
  }, [allSlices, previewSliceId]);

  const sameViewModalSlices = useMemo(() => {
    if (!modalSlice) return [];
    return allSlices.filter(
      (s) => (s.plane || "axial").toLowerCase() === (modalSlice.plane || "axial").toLowerCase()
    );
  }, [allSlices, modalSlice]);

  const modalSliceIndex = useMemo(() => {
    if (!modalSlice) return -1;
    return sameViewModalSlices.findIndex((s) => s.id === modalSlice.id);
  }, [modalSlice, sameViewModalSlices]);

  const prevModalSlice = modalSliceIndex > 0 ? sameViewModalSlices[modalSliceIndex - 1] : null;
  const nextModalSlice =
    modalSliceIndex >= 0 && modalSliceIndex < sameViewModalSlices.length - 1
      ? sameViewModalSlices[modalSliceIndex + 1]
      : null;

  const updateEditField = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateModalityMetadata = (key, value) => {
    setEditForm((current) => ({
      ...current,
      modalityMetadata: {
        ...current.modalityMetadata,
        [key]: value,
      },
    }));
  };

  const handleAddTag = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const val = tagInput.trim().replace(/^,|,$/g, "");
      if (val && !editForm.symptoms.some((s) => s.toLowerCase() === val.toLowerCase())) {
        setEditForm((current) => ({
          ...current,
          symptoms: [...current.symptoms, val],
        }));
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditForm((current) => ({
      ...current,
      symptoms: current.symptoms.filter((s) => s !== tagToRemove),
    }));
  };

  const addFiles = (fileList, targetView = uploadTargetView) => {
    const files = Array.from(fileList || []).filter(isSupportedUpload);
    if (files.length === 0) return;

    const newSliceObjects = files.map((file, idx) => ({
      id: `new_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      isExisting: false,
      file,
      filename: file.name,
      file_size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
      plane: targetView || "axial",
      isKey: false,
      previewUrl: URL.createObjectURL(file),
    }));

    setEditForm((current) => {
      if (!current) return current;
      return {
        ...current,
        newSlices: [...current.newSlices, ...newSliceObjects],
      };
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updateSliceView = (sliceId, newView) => {
    const normalized = (newView || "axial").toLowerCase();
    setEditForm((current) => {
      if (!current) return current;
      return {
        ...current,
        existingSlices: current.existingSlices.map((s) =>
          s.id === sliceId ? { ...s, plane: normalized } : s
        ),
        newSlices: current.newSlices.map((s) =>
          s.id === sliceId ? { ...s, plane: normalized } : s
        ),
      };
    });
  };

  const toggleSliceKey = (sliceId) => {
    setEditForm((current) => {
      if (!current) return current;

      const updatedExisting = current.existingSlices.map((s) =>
        s.id === sliceId ? { ...s, isKey: !s.isKey } : s
      );
      const updatedNew = current.newSlices.map((s) =>
        s.id === sliceId ? { ...s, isKey: !s.isKey } : s
      );

      const firstExistingKey = updatedExisting.find((s) => s.isKey);

      return {
        ...current,
        existingSlices: updatedExisting,
        newSlices: updatedNew,
        primaryFileId: firstExistingKey ? firstExistingKey.id : null,
      };
    });
  };

  const removeSlice = (sliceId) => {
    if (previewSliceId === sliceId) {
      setPreviewSliceId(null);
    }
    setEditForm((current) => {
      if (!current) return current;
      const isExisting = current.existingSlices.some((s) => s.id === sliceId);
      let updatedExisting = current.existingSlices;
      let updatedNew = current.newSlices;
      let deletedIds = current.deletedFileIds || [];

      if (isExisting) {
        updatedExisting = current.existingSlices.filter((s) => s.id !== sliceId);
        deletedIds = [...deletedIds, sliceId];
      } else {
        const toDelete = current.newSlices.find((s) => s.id === sliceId);
        if (toDelete?.previewUrl) URL.revokeObjectURL(toDelete.previewUrl);
        updatedNew = current.newSlices.filter((s) => s.id !== sliceId);
      }

      const firstRemainingKey = updatedExisting.find((s) => s.isKey);
      const nextPrimaryId = firstRemainingKey ? firstRemainingKey.id : null;

      return {
        ...current,
        deletedFileIds: deletedIds,
        existingSlices: updatedExisting,
        newSlices: updatedNew,
        primaryFileId: nextPrimaryId,
      };
    });
  };

  const moveSlice = (sliceId, direction) => {
    const viewList = [...activeViewSlices];
    const idx = viewList.findIndex((s) => s.id === sliceId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= viewList.length) return;

    const sourceSlice = viewList[idx];
    const targetSlice = viewList[targetIdx];

    setEditForm((current) => {
      if (!current) return current;

      const inExist1 = current.existingSlices.findIndex((s) => s.id === sourceSlice.id);
      const inExist2 = current.existingSlices.findIndex((s) => s.id === targetSlice.id);
      if (inExist1 !== -1 && inExist2 !== -1) {
        const next = [...current.existingSlices];
        const temp = next[inExist1];
        next[inExist1] = next[inExist2];
        next[inExist2] = temp;
        return { ...current, existingSlices: next };
      }

      const inNew1 = current.newSlices.findIndex((s) => s.id === sourceSlice.id);
      const inNew2 = current.newSlices.findIndex((s) => s.id === targetSlice.id);
      if (inNew1 !== -1 && inNew2 !== -1) {
        const next = [...current.newSlices];
        const temp = next[inNew1];
        next[inNew1] = next[inNew2];
        next[inNew2] = temp;
        return { ...current, newSlices: next };
      }

      return current;
    });
  };

  const handleSliceDrop = (targetSliceId) => {
    if (!draggedSliceId || draggedSliceId === targetSliceId) return;

    setEditForm((current) => {
      if (!current) return current;

      const inExist1 = current.existingSlices.findIndex((s) => s.id === draggedSliceId);
      const inExist2 = current.existingSlices.findIndex((s) => s.id === targetSliceId);
      if (inExist1 !== -1 && inExist2 !== -1) {
        const next = [...current.existingSlices];
        const [moved] = next.splice(inExist1, 1);
        next.splice(inExist2, 0, moved);
        return { ...current, existingSlices: next };
      }

      const inNew1 = current.newSlices.findIndex((s) => s.id === draggedSliceId);
      const inNew2 = current.newSlices.findIndex((s) => s.id === targetSliceId);
      if (inNew1 !== -1 && inNew2 !== -1) {
        const next = [...current.newSlices];
        const [moved] = next.splice(inNew1, 1);
        next.splice(inNew2, 0, moved);
        return { ...current, newSlices: next };
      }

      return current;
    });
  };

  const handleFileUpload = (event) => {
    addFiles(event.target.files, uploadTargetView);
  };

  const replaceSubmission = (nextSubmission) => {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === nextSubmission.id ? nextSubmission : submission,
      ),
    );
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editSubmission || !editForm) {
      return;
    }

    if (!editForm.artifactName.trim()) {
      setActionError("Artifact name is required.");
      setEditTab("details");
      return;
    }
    if (editForm.description.trim().length < 10) {
      setActionError("Add a description of at least 10 characters.");
      setEditTab("details");
      return;
    }

    const totalRemainingSlices = editForm.existingSlices.length + editForm.newSlices.length;
    if (totalRemainingSlices === 0) {
      setActionError("At least 1 image slice is required for this artifact.");
      setEditTab("media");
      return;
    }

    if (Array.isArray(modalitySchemaFields)) {
      for (const field of modalitySchemaFields) {
        if (field.is_required || field.required) {
          const val = editForm.modalityMetadata?.[field.key];
          if (val === undefined || val === null || String(val).trim() === "") {
            setActionError(`Please provide a value for required parameter "${field.label || field.key}".`);
            setEditTab("acquisition");
            return;
          }
        }
      }
    }

    setIsActionBusy(true);
    setActionError("");

    try {
      const formData = new FormData();
      formData.append("artifact_name", editForm.artifactName.trim());
      formData.append("modality", editForm.modality);
      formData.append("description", editForm.description.trim());
      formData.append("scanner", editForm.scanner.trim());
      formData.append("sequence", editForm.sequence.trim());
      formData.append("protocol", editForm.protocol.trim());
      formData.append("field_strength", editForm.fieldStrength.trim());
      formData.append("symptoms", JSON.stringify(editForm.symptoms));
      formData.append("remedies", editForm.remedies.trim());
      formData.append("references", editForm.references.trim());
      formData.append("submitter_notes", editForm.submitterNotes.trim());
      formData.append("modality_metadata", JSON.stringify(editForm.modalityMetadata || {}));
      formData.append("deleted_file_ids", JSON.stringify(editForm.deletedFileIds));

      if (editForm.primaryFileId) {
        formData.append("primary_file_id", editForm.primaryFileId);
      } else {
        const newKeyIndex = editForm.newSlices.findIndex((s) => s.isKey);
        if (newKeyIndex !== -1) {
          formData.append(
            "primary_slice_index",
            String(editForm.existingSlices.length + newKeyIndex),
          );
        }
      }

      const allSliceMetadata = [
        ...editForm.existingSlices.map((s, idx) => ({
          id: s.id,
          filename: s.filename,
          index: idx,
          isKey: Boolean(s.isKey),
          plane: (s.plane || "axial").toLowerCase(),
          public_url: s.public_url || null,
        })),
        ...editForm.newSlices.map((s, idx) => ({
          filename: s.filename,
          index: editForm.existingSlices.length + idx,
          isKey: Boolean(s.isKey),
          plane: (s.plane || "axial").toLowerCase(),
        })),
      ];
      formData.append("slice_metadata", JSON.stringify(allSliceMetadata));

      editForm.newSlices.forEach((sliceObj) => {
        formData.append("files", sliceObj.file);
      });

      if (editForm.axialMontageFile) {
        formData.append("axial_montage", editForm.axialMontageFile);
      }
      if (editForm.coronalMontageFile) {
        formData.append("coronal_montage", editForm.coronalMontageFile);
      }
      if (editForm.sagittalMontageFile) {
        formData.append("sagittal_montage", editForm.sagittalMontageFile);
      }

      const updatedSubmission = await updateMySubmission(editSubmission.id, formData);
      replaceSubmission(updatedSubmission);
      closeEdit();
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
      closeWithdraw();
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
      closeRepublish();
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
                  const canWithdrawArtifact =
                    artifact && removableArtifactStatuses.has(artifact.status);
                  const canRepublishArtifact =
                    artifact &&
                    (republishableArtifactStatuses.has(artifact.status) ||
                      artifact.status === "draft");
                  const republishTitle =
                    artifact?.status === "draft" ? "Publish draft" : "Republish artifact";

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

      {/* Floating Popup: Edit Artifact */}
      {editSubmission && editForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5 backdrop-blur-xs">
          <form
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-fade-in"
            onSubmit={submitEdit}
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4 bg-white">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-pen-to-square text-brand-600"></i>
                  Edit Artifact
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update artifact details, acquisition parameters, and media slices.
                </p>
              </div>
              <button
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                onClick={closeEdit}
                type="button"
              >
                <span className="sr-only">Close</span>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* 3 Section Tabs */}
            <div className="flex shrink-0 border-b border-gray-200 bg-gray-50 px-6 gap-2">
              <button
                className={`border-b-2 py-3 px-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  editTab === "details"
                    ? "border-brand-600 text-brand-600 bg-white -mb-[1px]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setEditTab("details")}
                type="button"
              >
                <i className="fas fa-file-lines text-xs"></i>
                Diagnostic Details
              </button>
              <button
                className={`border-b-2 py-3 px-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  editTab === "acquisition"
                    ? "border-brand-600 text-brand-600 bg-white -mb-[1px]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setEditTab("acquisition")}
                type="button"
              >
                <i className="fas fa-sliders text-xs"></i>
                Acquisition Parameters
              </button>
              <button
                className={`border-b-2 py-3 px-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  editTab === "media"
                    ? "border-brand-600 text-brand-600 bg-white -mb-[1px]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setEditTab("media")}
                type="button"
              >
                <i className="fas fa-images text-xs"></i>
                Slices & Montages
                <span className="rounded-full bg-brand-100 px-2 py-0.2 text-[10px] font-bold text-brand-700">
                  {editForm.existingSlices.length + editForm.newSlices.length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
              {actionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 flex items-start gap-2">
                  <i className="fas fa-circle-exclamation mt-0.5 text-red-500"></i>
                  <span>{actionError}</span>
                </div>
              )}

              {/* SECTION 1: DIAGNOSTIC DETAILS */}
              {editTab === "details" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700" htmlFor="artifactName">
                        Artifact Name
                      </label>
                      <input
                        className={fieldClass}
                        id="artifactName"
                        maxLength="255"
                        name="artifactName"
                        onChange={updateEditField}
                        placeholder="e.g., Zipper Artifact, Fat Shift"
                        required
                        type="text"
                        value={editForm.artifactName}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="modality">
                        Modality
                      </label>
                      <select
                        className={fieldClass}
                        id="modality"
                        name="modality"
                        onChange={updateEditField}
                        required
                        value={editForm.modality}
                      >
                        <option value="">Select Modality</option>
                        {modalityOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative" ref={scannerDropdownRef}>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="scanner">
                        Scanner
                      </label>
                      <input
                        autoComplete="off"
                        className={fieldClass}
                        id="scanner"
                        name="scanner"
                        onFocus={() => setShowScannerSuggestions(true)}
                        onChange={(e) => {
                          updateEditField(e);
                          setShowScannerSuggestions(true);
                        }}
                        placeholder="e.g., Siemens Prisma (3T)"
                        type="text"
                        value={editForm.scanner}
                      />
                      {showScannerSuggestions && filteredScannerSuggestions.length > 0 && (
                        <div className="absolute z-40 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-3 py-1.5 bg-gray-50/90 text-[10px] font-semibold text-gray-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                            Previously Submitted Scanners ({filteredScannerSuggestions.length})
                          </div>
                          {filteredScannerSuggestions.slice(0, 10).map((item) => (
                            <button
                              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-800 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-2 cursor-pointer"
                              key={item}
                              onClick={() => {
                                setEditForm((c) => ({ ...c, scanner: item }));
                                setShowScannerSuggestions(false);
                              }}
                              type="button"
                            >
                              <i className="fas fa-server text-gray-400 text-[10px]"></i>
                              <span className="truncate">{item}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative" ref={sequenceDropdownRef}>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="sequence">
                        Sequence
                      </label>
                      <input
                        autoComplete="off"
                        className={fieldClass}
                        id="sequence"
                        name="sequence"
                        onFocus={() => setShowSequenceSuggestions(true)}
                        onChange={(e) => {
                          updateEditField(e);
                          setShowSequenceSuggestions(true);
                        }}
                        placeholder="e.g., 3D GRASE"
                        type="text"
                        value={editForm.sequence}
                      />
                      {showSequenceSuggestions && filteredSequenceSuggestions.length > 0 && (
                        <div className="absolute z-40 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-3 py-1.5 bg-gray-50/90 text-[10px] font-semibold text-gray-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                            Previously Submitted Sequences ({filteredSequenceSuggestions.length})
                          </div>
                          {filteredSequenceSuggestions.slice(0, 10).map((item) => (
                            <button
                              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-800 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-2 cursor-pointer"
                              key={item}
                              onClick={() => {
                                setEditForm((c) => ({ ...c, sequence: item }));
                                setShowSequenceSuggestions(false);
                              }}
                              type="button"
                            >
                              <i className="fas fa-wave-square text-gray-400 text-[10px]"></i>
                              <span className="truncate">{item}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="symptoms">
                      Observed Symptoms (Tags)
                    </label>
                    <div className="p-2 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus-within:ring-brand-500 focus-within:border-brand-500 shadow-sm transition-colors">
                      <div className="flex flex-wrap gap-2">
                        {editForm.symptoms.map((tag) => (
                          <button
                            className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-600"
                            key={tag}
                            onClick={() => handleRemoveTag(tag)}
                            type="button"
                          >
                            {tag}
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        ))}
                        <input
                          className="min-w-56 flex-1 border-0 p-1 text-sm text-gray-900 outline-none"
                          id="symptoms"
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="Type symptom and press Enter (e.g., banding, blur)"
                          type="text"
                          value={tagInput}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
                      Description
                    </label>
                    <textarea
                      className={fieldClass}
                      id="description"
                      name="description"
                      onChange={updateEditField}
                      placeholder="Provide background on the scan, how the artifact was identified, and any other relevant context..."
                      required
                      rows="4"
                      value={editForm.description}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="remedies">
                      Remedies & Solutions
                    </label>
                    <textarea
                      className={fieldClass}
                      id="remedies"
                      name="remedies"
                      onChange={updateEditField}
                      placeholder="List potential remedies, sequence adjustments, or clinical solutions..."
                      rows="3"
                      value={editForm.remedies}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="references">
                        References
                      </label>
                      <textarea
                        className={fieldClass}
                        id="references"
                        name="references"
                        onChange={updateEditField}
                        placeholder="Add scientific references or citations (one per line)..."
                        rows="3"
                        value={editForm.references}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="submitterNotes">
                        Submitter Notes
                      </label>
                      <textarea
                        className={fieldClass}
                        id="submitterNotes"
                        name="submitterNotes"
                        onChange={updateEditField}
                        placeholder="Anything reviewers should know before triage..."
                        rows="3"
                        value={editForm.submitterNotes}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: ACQUISITION PARAMETERS */}
              {editTab === "acquisition" && (
                <div className="space-y-5">
                  {/* Dynamic Modality Metadata Schema Fields */}
                  {editForm.modality ? (
                    <div className="rounded-2xl border border-brand-200/80 bg-brand-50/20 p-5 sm:p-6 shadow-xs transition-all">
                      <div className="flex flex-wrap items-center justify-between border-b border-brand-100/80 pb-3.5 mb-4 gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shadow-2xs">
                            <i className="fas fa-sliders"></i>
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-gray-900">
                              {editForm.modality || "Perfusion"} Acquisition Parameters
                            </h4>
                            <p className="text-xs text-gray-500">
                              Pulse sequence and acquisition settings for this scan
                            </p>
                          </div>
                        </div>
                        {loadingSchema && (
                          <span className="text-xs text-brand-600 font-semibold flex items-center gap-1.5">
                            <i className="fas fa-spinner fa-spin"></i> Loading schema...
                          </span>
                        )}
                      </div>

                      {modalitySchemaFields.length === 0 && !loadingSchema ? (
                        <p className="text-xs text-gray-400 italic">
                          No custom parameters configured for {editForm.modality}.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {modalitySchemaFields.map((field) => (
                            <div className="space-y-1.5" key={field.key}>
                              <div className="flex items-center justify-between gap-1">
                                <label
                                  className="block text-xs font-bold text-gray-700 truncate"
                                  htmlFor={`meta_${field.key}`}
                                  title={field.label}
                                >
                                  {field.label}
                                  {(field.is_required || field.required) && (
                                    <span className="text-red-500 ml-1 font-bold">*</span>
                                  )}
                                </label>
                                {field.unit && (
                                  <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200/70 px-1.5 py-0.5 rounded flex-shrink-0">
                                    {field.unit}
                                  </span>
                                )}
                              </div>
                              <div className="relative">
                                {field.type === "select" || (Array.isArray(field.options) && field.options.length > 0) ? (
                                  <select
                                    className="p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-sm focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors"
                                    id={`meta_${field.key}`}
                                    onChange={(e) => updateModalityMetadata(field.key, e.target.value)}
                                    value={editForm.modalityMetadata?.[field.key] ?? ""}
                                  >
                                    <option value="">Select option...</option>
                                    {field.options.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    className="p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-sm focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors"
                                    id={`meta_${field.key}`}
                                    onChange={(e) => updateModalityMetadata(field.key, e.target.value)}
                                    placeholder={field.example ? `e.g., ${field.example}` : `Enter ${field.label.toLowerCase()}...`}
                                    step="any"
                                    type={field.field_type === "number" || field.type === "number" ? "number" : "text"}
                                    value={editForm.modalityMetadata?.[field.key] ?? ""}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Any custom or existing keys in modalityMetadata that aren't in modalitySchemaFields */}
                      {(() => {
                        const schemaKeys = new Set(modalitySchemaFields.map((f) => f.key));
                        const extraKeys = Object.keys(editForm.modalityMetadata || {}).filter(
                          (k) =>
                            !schemaKeys.has(k) &&
                            editForm.modalityMetadata[k] !== undefined &&
                            editForm.modalityMetadata[k] !== null &&
                            String(editForm.modalityMetadata[k]).trim() !== "",
                        );
                        if (extraKeys.length === 0) return null;
                        return (
                          <div className="mt-4 pt-4 border-t border-brand-100/80">
                            <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                              Additional Saved Parameters
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {extraKeys.map((key) => (
                                <div className="space-y-1.5" key={key}>
                                  <label className="block text-xs font-bold text-gray-700 capitalize">
                                    {key.replace(/_/g, " ")}
                                  </label>
                                  <input
                                    className="p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-sm focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors"
                                    onChange={(e) => updateModalityMetadata(key, e.target.value)}
                                    type="text"
                                    value={editForm.modalityMetadata[key] ?? ""}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Please select a modality to view acquisition parameters.</p>
                  )}
                </div>
              )}


              {/* SECTION 3: SLICES & MONTAGES */}
              {editTab === "media" && (
                <div className="space-y-6">
                  {/* Combined Slice Upload, Drag & Drop, and Preview Canvas */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 flex items-center gap-2">
                          <i className="fas fa-images text-brand-500"></i> Artifact Image Slices{" "}
                          <span className="text-xs font-normal text-red-600">(Required - at least 1)</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Upload slice captures by view and tag key diagnostic slices.
                        </p>
                      </div>

                      {/* View Target Selector Tabs */}
                      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
                        {["axial", "coronal", "sagittal"].map((view) => {
                          const count = allSlices.filter(
                            (s) => (s.plane || "axial").toLowerCase() === view
                          ).length;
                          const isActive = activeViewTab === view;
                          return (
                            <button
                              key={view}
                              type="button"
                              onClick={() => {
                                setActiveViewTab(view);
                                setUploadTargetView(view);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                isActive
                                  ? "bg-brand-600 text-white shadow-xs font-bold"
                                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-200/70"
                              }`}
                            >
                              <span className="capitalize">{view}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                  isActive ? "bg-brand-800 text-white" : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Main Combined Canvas Dropzone & Cards Grid */}
                    <div
                      className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 transition-all relative ${
                        dragActive
                          ? "border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10"
                          : "border-gray-300 bg-gray-50/40"
                      }`}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (!draggedSliceId) setDragActive(true);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setDragActive(false);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          addFiles(e.dataTransfer.files, uploadTargetView);
                        }
                      }}
                    >
                      {allSlices.length === 0 ? (
                        /* Big Empty Dropzone State */
                        <div
                          className="py-12 text-center cursor-pointer group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="mx-auto w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <i className="fas fa-cloud-upload-alt text-3xl text-brand-500"></i>
                          </div>
                          <h4 className="text-sm font-bold text-gray-800">
                            Upload {uploadTargetView.toUpperCase()} Artifact Slices
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            Drag and drop slice series here, or{" "}
                            <span className="text-brand-600 font-semibold underline">browse local files</span>
                          </p>
                          <p className="text-[11px] text-gray-400 mt-2">PNG, JPG, JPEG (max 50MB)</p>
                        </div>
                      ) : (
                        /* Uploaded Slices Cards Grid & Add More Tile */
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 font-medium pb-3 border-b border-gray-200/80 gap-2">
                            <span className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 capitalize">{activeViewTab} View</span>
                              <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                                {activeViewSlices.length} slices
                              </span>
                            </span>
                            <span className="text-gray-400 italic">Drag to reorder • Tag key slices</span>
                          </div>

                          {activeViewSlices.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                              <p className="text-sm text-gray-500 font-medium">No {activeViewTab} slices uploaded.</p>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
                              >
                                Upload {activeViewTab} slices now
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {activeViewSlices.map((slice, index) => (
                                <div
                                  key={slice.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", slice.id);
                                    e.dataTransfer.effectAllowed = "move";
                                    setDraggedSliceId(slice.id);
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    if (
                                      draggedSliceId &&
                                      draggedSliceId !== slice.id &&
                                      dragOverSliceId !== slice.id
                                    ) {
                                      setDragOverSliceId(slice.id);
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverSliceId === slice.id) {
                                      setDragOverSliceId(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    handleSliceDrop(slice.id);
                                    setDraggedSliceId(null);
                                    setDragOverSliceId(null);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedSliceId(null);
                                    setDragOverSliceId(null);
                                  }}
                                  className={`relative rounded-xl border p-3.5 bg-white transition-all flex flex-col justify-between cursor-grab active:cursor-grabbing select-none ${
                                    draggedSliceId === slice.id
                                      ? "opacity-40 scale-95 border-dashed border-brand-500 bg-brand-50/20"
                                      : dragOverSliceId === slice.id
                                      ? "ring-2 ring-brand-500 border-brand-400 bg-brand-50/40 scale-[1.02] shadow-md"
                                      : slice.isKey
                                      ? "border-slate-400 ring-2 ring-slate-400/15 bg-slate-50/50 shadow-sm"
                                      : "border-gray-200 hover:border-brand-300"
                                  }`}
                                >
                                  {slice.isKey && (
                                    <div className="absolute -top-2.5 left-4 bg-cyan-900 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded shadow-sm flex items-center gap-1.5 z-10 border border-cyan-700/50">
                                      <i className="fas fa-bookmark text-cyan-300"></i> Key Diagnostic Slice
                                    </div>
                                  )}

                                  <div>
                                    <div className="flex items-start gap-3 mb-3">
                                      <div className="flex flex-col items-center justify-center pt-3 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                                        <i className="fas fa-grip-vertical text-xs" title="Drag card to reorder"></i>
                                      </div>

                                      {/* Clickable Thumbnail for Full Preview */}
                                      <button
                                        type="button"
                                        onClick={() => setPreviewSliceId(slice.id)}
                                        className="w-16 h-16 rounded-xl bg-gray-900 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200 relative group cursor-pointer"
                                        title="Click for full preview"
                                      >
                                        {slice.previewUrl ? (
                                          <img
                                            src={slice.previewUrl}
                                            alt={slice.filename}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                          />
                                        ) : (
                                          <i className="fas fa-brain text-brand-400 text-xl"></i>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                                          <i className="fas fa-search-plus"></i>
                                        </div>
                                        <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl">
                                          #{index + 1}
                                        </span>
                                      </button>

                                      <div className="min-w-0 flex-1 flex flex-col justify-between h-16">
                                        <div>
                                          <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <h4
                                                className="text-xs font-bold text-gray-900 truncate"
                                                title={slice.filename}
                                              >
                                                {slice.filename}
                                              </h4>
                                              {!slice.isExisting && (
                                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                                  NEW
                                                </span>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => removeSlice(slice.id)}
                                              className="text-gray-400 hover:text-red-600 p-0.5 shrink-0"
                                              title="Remove slice"
                                            >
                                              <i className="fas fa-times text-xs"></i>
                                            </button>
                                          </div>
                                          <p className="text-[11px] text-gray-500">{formatSliceSize(slice)}</p>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] uppercase font-bold text-gray-400">View:</span>
                                          <select
                                            value={(slice.plane || "axial").toLowerCase()}
                                            onChange={(e) => updateSliceView(slice.id, e.target.value)}
                                            className="text-xs border border-gray-300 rounded-md py-0.5 px-2 bg-white text-gray-800 font-medium focus:ring-brand-500 focus:border-brand-500"
                                          >
                                            <option value="axial">Axial</option>
                                            <option value="coronal">Coronal</option>
                                            <option value="sagittal">Sagittal</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Clean Medical Action Toolbar */}
                                  <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => toggleSliceKey(slice.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
                                        slice.isKey
                                          ? "bg-cyan-900 text-white shadow-xs border border-cyan-700/50"
                                          : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                                      }`}
                                      title="Toggle Key Slice"
                                    >
                                      <i
                                        className={`fas fa-bookmark text-xs ${
                                          slice.isKey ? "text-cyan-300" : "text-gray-400"
                                        }`}
                                      ></i>
                                      <span>Key Slice</span>
                                    </button>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewSliceId(slice.id)}
                                        className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300 text-gray-600 flex items-center justify-center transition-colors"
                                        title="Full image preview"
                                      >
                                        <i className="fas fa-expand-alt text-xs"></i>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={() => moveSlice(slice.id, "up")}
                                        className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                        title="Move slice left"
                                      >
                                        <i className="fas fa-chevron-left text-xs"></i>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={index === activeViewSlices.length - 1}
                                        onClick={() => moveSlice(slice.id, "down")}
                                        className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                        title="Move slice right"
                                      >
                                        <i className="fas fa-chevron-right text-xs"></i>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Inline Add More Slices Tile */}
                              <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 hover:border-brand-500 hover:bg-brand-50/40 bg-white rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[160px] text-center group"
                              >
                                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                  <i className="fas fa-plus text-base"></i>
                                </div>
                                <span className="text-xs font-bold text-gray-800 group-hover:text-brand-600">
                                  Add {uploadTargetView.toUpperCase()} Slices
                                </span>
                                <span className="text-[11px] text-gray-400 mt-1">Click or drop files here</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        accept={ACCEPTED_EXTENSIONS.join(",")}
                        className="sr-only"
                        multiple
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        type="file"
                      />
                    </div>
                  </div>

                  {/* Section 2: Volume Montages (Optional) */}
                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <i className="fas fa-th text-brand-500"></i> Overview Montages{" "}
                        <span className="text-xs font-normal text-gray-500">(Optional)</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Upload multi-slice grid montages for each view.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        {
                          existing: editForm.existingAxialMontage,
                          file: editForm.axialMontageFile,
                          icon: "fa-square",
                          label: "Axial Montage Grid",
                          onClearExisting: () =>
                            setEditForm((c) => ({
                              ...c,
                              deletedFileIds: c.existingAxialMontage
                                ? [...c.deletedFileIds, c.existingAxialMontage.id]
                                : c.deletedFileIds,
                              existingAxialMontage: null,
                            })),
                          setFile: (file) => setEditForm((c) => ({ ...c, axialMontageFile: file })),
                        },
                        {
                          existing: editForm.existingCoronalMontage,
                          file: editForm.coronalMontageFile,
                          icon: "fa-border-all",
                          label: "Coronal Montage Grid",
                          onClearExisting: () =>
                            setEditForm((c) => ({
                              ...c,
                              deletedFileIds: c.existingCoronalMontage
                                ? [...c.deletedFileIds, c.existingCoronalMontage.id]
                                : c.deletedFileIds,
                              existingCoronalMontage: null,
                            })),
                          setFile: (file) => setEditForm((c) => ({ ...c, coronalMontageFile: file })),
                        },
                        {
                          existing: editForm.existingSagittalMontage,
                          file: editForm.sagittalMontageFile,
                          icon: "fa-columns",
                          label: "Sagittal Montage Grid",
                          onClearExisting: () =>
                            setEditForm((c) => ({
                              ...c,
                              deletedFileIds: c.existingSagittalMontage
                                ? [...c.deletedFileIds, c.existingSagittalMontage.id]
                                : c.deletedFileIds,
                              existingSagittalMontage: null,
                            })),
                          setFile: (file) => setEditForm((c) => ({ ...c, sagittalMontageFile: file })),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-gray-800">
                              <i className={`fas ${item.icon} text-brand-500`}></i> {item.label}
                            </div>
                            {item.file ? (
                              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center justify-between">
                                <span className="truncate max-w-[120px] font-medium" title={item.file.name}>
                                  {item.file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => item.setFile(null)}
                                  className="text-emerald-700 hover:text-red-600 ml-2"
                                  title="Remove montage file"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ) : item.existing ? (
                              <div className="text-xs text-brand-700 bg-brand-50 border border-brand-200 p-2.5 rounded-lg flex items-center justify-between">
                                <span
                                  className="truncate max-w-[120px] font-medium"
                                  title={item.existing.filename || "Uploaded montage"}
                                >
                                  {item.existing.filename || "Current montage"}
                                </span>
                                <button
                                  type="button"
                                  onClick={item.onClearExisting}
                                  className="text-brand-700 hover:text-red-600 ml-2"
                                  title="Remove saved montage"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ) : (
                              <p className="text-[11px] text-gray-400 mb-3">No montage file selected.</p>
                            )}
                          </div>

                          <label className="mt-3 block text-center bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold py-2 px-3 rounded-lg cursor-pointer transition-colors shadow-xs">
                            <i className="fas fa-upload mr-1.5 text-gray-500"></i>
                            {item.file || item.existing ? "Change Image" : "Upload Image"}
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg"
                              className="sr-only"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  item.setFile(e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3.5">
              <span className="text-xs text-gray-500">
                {editForm.existingSlices.length + editForm.newSlices.length} total slice(s)
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  disabled={isActionBusy}
                  onClick={closeEdit}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60 flex items-center gap-2"
                  disabled={isActionBusy}
                  type="submit"
                >
                  {isActionBusy ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox Preview Modal for Slices */}
      {modalSlice && (
        <div
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setPreviewSliceId(null)}
        >
          <div
            className="relative bg-gray-900 border border-gray-800 text-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950">
              <div className="flex items-center gap-3 min-w-0">
                <span className="uppercase text-xs font-bold px-2.5 py-1 rounded-full bg-brand-900/60 text-brand-300 border border-brand-700/50">
                  {modalSlice.plane || "axial"}
                </span>
                <h3 className="text-sm font-semibold text-gray-100 truncate" title={modalSlice.filename}>
                  {modalSlice.filename}
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  #{modalSliceIndex + 1} of {sameViewModalSlices.length}
                </span>
                {modalSlice.isKey && (
                  <span className="bg-cyan-950 text-cyan-200 border border-cyan-600/50 text-xs px-2.5 py-0.5 rounded font-medium flex items-center gap-1.5">
                    <i className="fas fa-bookmark text-cyan-400"></i> Key Slice
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewSliceId(null)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                title="Close preview"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Modal Image Body */}
            <div className="flex-1 flex items-center justify-center p-6 bg-black relative min-h-[350px] max-h-[65vh] overflow-hidden">
              {modalSlice.previewUrl ? (
                <img
                  src={modalSlice.previewUrl}
                  alt={modalSlice.filename}
                  className="max-h-[60vh] max-w-full object-contain rounded shadow-lg"
                />
              ) : (
                <i className="fas fa-brain text-gray-600 text-6xl"></i>
              )}

              {/* Prev / Next on-image arrows */}
              {prevModalSlice && (
                <button
                  type="button"
                  onClick={() => setPreviewSliceId(prevModalSlice.id)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-900/80 border border-gray-700 text-white hover:bg-brand-600 transition-colors flex items-center justify-center cursor-pointer"
                  title="Previous slice"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
              )}
              {nextModalSlice && (
                <button
                  type="button"
                  onClick={() => setPreviewSliceId(nextModalSlice.id)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-900/80 border border-gray-700 text-white hover:bg-brand-600 transition-colors flex items-center justify-center cursor-pointer"
                  title="Next slice"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-950 text-xs">
              <button
                type="button"
                onClick={() => toggleSliceKey(modalSlice.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  modalSlice.isKey
                    ? "bg-cyan-900 text-white border border-cyan-700/50"
                    : "bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700"
                }`}
              >
                <i className={`fas fa-bookmark text-xs ${modalSlice.isKey ? "text-cyan-300" : "text-gray-400"}`}></i>
                <span>{modalSlice.isKey ? "Key Diagnostic Slice (Active)" : "Mark as Key Slice"}</span>
              </button>

              <div className="flex items-center gap-2">
                {modalSlice.previewUrl && (
                  <a
                    href={modalSlice.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center gap-1.5"
                  >
                    <i className="fas fa-external-link-alt text-xs"></i>
                    <span>Open Full Image</span>
                  </a>
                )}
                <button
                  type="button"
                  disabled={!prevModalSlice}
                  onClick={() => prevModalSlice && setPreviewSliceId(prevModalSlice.id)}
                  className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  <i className="fas fa-chevron-left mr-1"></i> Prev
                </button>
                <button
                  type="button"
                  disabled={!nextModalSlice}
                  onClick={() => nextModalSlice && setPreviewSliceId(nextModalSlice.id)}
                  className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Next <i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          </div>
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

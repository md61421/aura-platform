import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { createSubmission, fetchArtifacts, fetchMetadataSchema } from "../services/api";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 500;
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg"];

const INITIAL_FORM = {
  artifactName: "",
  modality: "",
  category: "",
  scanner: "",
  sequence: "",
  protocol: "",
  fieldStrength: "",
  symptoms: [],
  description: "",
  remedies: "",
  references: "",
  submitterNotes: "",
  permissionConfirmed: true,
  pseudonymisationConfirmed: true,
};

const modalityOptions = ["ASL", "DSC", "DCE", "IVIM", "MULTI", "UNKNOWN"];
const categoryOptions = [
  "Motion",
  "Susceptibility",
  "Hardware/RF",
  "Flow",
  "Noise",
  "Contrast bolus",
  "Reconstruction",
  "Other",
];

const fieldClass =
  "mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors";

const normaliseTags = (values) => {
  const seen = new Set();
  return values
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const isSupportedUpload = (file) => {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
};

const formatFileSize = (bytes) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const validateSubmission = (form, slices, modalityMetadata = {}, modalitySchemaFields = []) => {
  if (!form.artifactName.trim()) {
    return "Artifact name is required.";
  }
  if (!form.modality) {
    return "Select a modality.";
  }
  if (!form.category) {
    return "Select a category.";
  }
  if (form.description.trim().length < 10) {
    return "Add a description of at least 10 characters.";
  }
  if (!slices || slices.length === 0) {
    return "Upload at least 1 image slice for this artifact.";
  }
  if (Array.isArray(modalitySchemaFields)) {
    for (const field of modalitySchemaFields) {
      if (field.is_required || field.required) {
        const val = modalityMetadata?.[field.key];
        if (val === undefined || val === null || String(val).trim() === "") {
          return `Please provide a value for required parameter "${field.label || field.key}".`;
        }
      }
    }
  }
  return "";
};

function Submission() {
  const {
    isAuthenticated,
    loading: authLoading,
    user,
    auraUser,
  } = useAuth();
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [slices, setSlices] = useState([]);
  const [axialMontageFile, setAxialMontageFile] = useState(null);
  const [coronalMontageFile, setCoronalMontageFile] = useState(null);
  const [sagittalMontageFile, setSagittalMontageFile] = useState(null);
  const [activeViewTab, setActiveViewTab] = useState("axial");
  const [uploadTargetView, setUploadTargetView] = useState("axial");
  const [previewSliceId, setPreviewSliceId] = useState(null);
  const [draggedSliceId, setDraggedSliceId] = useState(null);
  const [dragOverSliceId, setDragOverSliceId] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState("publish");
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [modalitySchemaFields, setModalitySchemaFields] = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [modalityMetadata, setModalityMetadata] = useState({});

  // Artifact name autocomplete suggestions & auto-fill state
  const [existingArtifacts, setExistingArtifacts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autoFilledFrom, setAutoFilledFrom] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchArtifacts({ limit: 100 })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setExistingArtifacts(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch existing artifacts for suggestions:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!form.modality) {
      setModalitySchemaFields([]);
      return;
    }
    let isMounted = true;
    setLoadingSchema(true);
    fetchMetadataSchema(form.modality)
      .then((data) => {
        if (isMounted) {
          const fields = Array.isArray(data) ? data : [];
          const filtered = fields.filter(
            (f) => !f.modality || f.modality === form.modality || f.modality === "ALL"
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
  }, [form.modality]);

  const filteredSuggestions = form.artifactName.trim()
    ? existingArtifacts.filter((item) => {
        const query = form.artifactName.trim().toLowerCase();
        const titleMatch = (item.title || item.name || "").toLowerCase().includes(query);
        const aliasMatch =
          Array.isArray(item.aliases) &&
          item.aliases.some((a) => String(a).toLowerCase().includes(query));
        return titleMatch || aliasMatch;
      })
    : [];

  const handleSelectArtifactSuggestion = (artifact) => {
    const selectedTitle = artifact.title || artifact.name || "";
    const selectedDescription =
      artifact.description || artifact.visual_description || artifact.explanation || "";

    setForm((current) => ({
      ...current,
      artifactName: selectedTitle,
      // currently only description should auto fill
      description: selectedDescription || current.description,
    }));
    setAutoFilledFrom(selectedTitle);
    setShowSuggestions(false);
  };

  const updateModalityMetadata = (key, value) => {
    setModalityMetadata((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateField = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    slices.forEach((s) => {
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
    });
    setForm(INITIAL_FORM);
    setSlices([]);
    setModalityMetadata({});
    setActiveViewTab("axial");
    setUploadTargetView("axial");
    setPreviewSliceId(null);
    setDraggedSliceId(null);
    setDragOverSliceId(null);
    setTagInput("");
    setFormError("");
    setReceipt(null);
    setShowSuggestions(false);
    setAutoFilledFrom(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resequenceSlices = (sliceList) => {
    const counts = { axial: 0, coronal: 0, sagittal: 0 };
    return sliceList.map((slice) => {
      counts[slice.view] = (counts[slice.view] || 0) + 1;
      return { ...slice, order: counts[slice.view] };
    });
  };

  const addFiles = (fileList) => {
    const incomingFiles = Array.from(fileList || []);
    if (incomingFiles.length === 0) return;

    let rejection = "";
    const nextSlices = [...slices];
    const existingSignatures = new Set(nextSlices.map((s) => `${s.file.name}-${s.file.size}`));

    incomingFiles.forEach((file) => {
      if (nextSlices.length >= MAX_FILES) {
        rejection = `Upload no more than ${MAX_FILES} slice files per submission.`;
        return;
      }
      if (!isSupportedUpload(file)) {
        rejection = `${file.name} is not a supported file type.`;
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejection = `${file.name} exceeds 50MB limit.`;
        return;
      }

      const sig = `${file.name}-${file.size}`;
      if (!existingSignatures.has(sig)) {
        existingSignatures.add(sig);
        const assignedView = uploadTargetView;

        const isImage =
          file.type.startsWith("image/") ||
          [".png", ".jpg", ".jpeg"].some((ext) => file.name.toLowerCase().endsWith(ext));

        nextSlices.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          view: assignedView,
          order: nextSlices.filter((s) => s.view === assignedView).length + 1,
          isPriority: false,
          previewUrl: isImage ? URL.createObjectURL(file) : null,
        });
      }
    });

    setSlices(resequenceSlices(nextSlices));
    setActiveViewTab(uploadTargetView);
    setFormError(rejection);
  };

  const handleFileInput = (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const removeSlice = (sliceId) => {
    if (previewSliceId === sliceId) {
      setPreviewSliceId(null);
    }
    setSlices((current) => {
      const target = current.find((s) => s.id === sliceId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return resequenceSlices(current.filter((s) => s.id !== sliceId));
    });
  };

  const updateSliceView = (sliceId, newView) => {
    setSlices((current) => {
      const updated = current.map((s) => (s.id === sliceId ? { ...s, view: newView } : s));
      return resequenceSlices(updated);
    });
  };

  const toggleSlicePriority = (sliceId) => {
    setSlices((current) =>
      current.map((s) => (s.id === sliceId ? { ...s, isPriority: !s.isPriority } : s))
    );
  };

  const moveSlice = (sliceId, direction) => {
    const activeSlices = slices
      .filter((s) => s.view === activeViewTab)
      .sort((a, b) => a.order - b.order);

    const index = activeSlices.findIndex((s) => s.id === sliceId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeSlices.length) return;

    const reorderedViewSlices = [...activeSlices];
    const [movedSlice] = reorderedViewSlices.splice(index, 1);
    reorderedViewSlices.splice(targetIndex, 0, movedSlice);

    const updatedViewSlices = reorderedViewSlices.map((s, idx) => ({ ...s, order: idx + 1 }));

    setSlices((current) => {
      const otherViewSlices = current.filter((s) => s.view !== activeViewTab);
      return [...otherViewSlices, ...updatedViewSlices];
    });
  };

  const handleSliceDrop = (targetSliceId) => {
    if (!draggedSliceId || draggedSliceId === targetSliceId) return;

    const activeSlices = slices
      .filter((s) => s.view === activeViewTab)
      .sort((a, b) => a.order - b.order);

    const sourceIndex = activeSlices.findIndex((s) => s.id === draggedSliceId);
    const targetIndex = activeSlices.findIndex((s) => s.id === targetSliceId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const reorderedViewSlices = [...activeSlices];
    const [movedSlice] = reorderedViewSlices.splice(sourceIndex, 1);
    reorderedViewSlices.splice(targetIndex, 0, movedSlice);

    const updatedViewSlices = reorderedViewSlices.map((s, idx) => ({ ...s, order: idx + 1 }));

    setSlices((current) => {
      const otherViewSlices = current.filter((s) => s.view !== activeViewTab);
      return [...otherViewSlices, ...updatedViewSlices];
    });
  };

  const commitTagInput = () => {
    const nextTags = normaliseTags([...form.symptoms, tagInput]);
    setForm((current) => ({ ...current, symptoms: nextTags }));
    setTagInput("");
    return nextTags;
  };

  const removeTag = (tagToRemove) => {
    setForm((current) => ({
      ...current,
      symptoms: current.symptoms.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTagInput();
    }
  };


  const handleSubmit = async (event) => {
    event.preventDefault();
    const action = event.nativeEvent.submitter?.value || "publish";
    if (authLoading) {
      setFormError("Checking your sign-in status. Try again in a moment.");
      return;
    }
    if (!isAuthenticated) {
      setFormError("Sign in before submitting an artifact.");
      return;
    }

    const symptomsForSubmit = normaliseTags([...form.symptoms, tagInput]);
    const userEmail = auraUser?.email || user?.email || "";
    const payload = {
      ...form,
      contactEmail: userEmail,
      symptoms: symptomsForSubmit,
    };
    const validationError = validateSubmission(payload, slices, modalityMetadata, modalitySchemaFields);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const rawFiles = slices.map((s) => s.file);
    let primaryIndex = slices.findIndex((s) => s.isPriority);
    if (primaryIndex === -1) {
      primaryIndex = slices.length > 2 ? Math.floor(slices.length / 2) : 0;
    }
    const sliceMetadata = slices.map((s, idx) => ({
      filename: s.file.name,
      view: s.view,
      slice_order: s.order,
      is_priority: idx === primaryIndex || s.isPriority,
    }));

    setSubmitAction(action);
    setSubmitting(true);
    setFormError("");

    try {
      const submissionReceipt = await createSubmission({
        ...payload,
        modalityMetadata,
        saveAsDraft: action === "draft",
        files: rawFiles,
        primaryIndex,
        axialMontageFile,
        coronalMontageFile,
        sagittalMontageFile,
        sliceMetadata,
      });
      setForm((current) => ({ ...current, symptoms: symptomsForSubmit }));
      setTagInput("");
      setReceipt(submissionReceipt);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setFormError(error.message || "Submission failed. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin"></div>
          <h1 className="text-xl font-bold text-gray-900">Checking sign-in status</h1>
          <p className="mt-2 text-sm text-gray-500">Preparing the submission workspace.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/auth?next=/submit" />;
  }

  if (receipt) {
    const isDraft = receipt.artifact?.status === "draft";

    return (
      <div id="submit-success" className="py-12 text-center animate-fade-in max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-check text-3xl text-green-600"></i>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {isDraft ? "Draft Saved" : "Submission Received!"}
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto mb-8">
          {isDraft
            ? "Your artifact draft is saved and visible in My Submissions."
            : "Your artifact is published to the community and linked to your account."}
        </p>
        <p className="text-xs text-gray-400 max-w-sm mx-auto mb-8">Receipt ID: {receipt.id}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button onClick={resetForm} className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-8 rounded-xl transition-colors shadow-lg shadow-brand-500/30" type="button">
            Submit Another
          </button>
          <Link to={isDraft ? "/profile" : `/artifact/${receipt.artifact?.id}`} className="bg-white border border-gray-300 text-gray-700 py-3 px-8 rounded-xl font-medium hover:bg-gray-50 transition-colors text-center">
            {isDraft ? "Go to My Submissions" : "View Artifact"}
          </Link>
        </div>
      </div>
    );
  }

  const activeViewSlices = slices
    .filter((s) => s.view === activeViewTab)
    .sort((a, b) => a.order - b.order);

  const modalSlice = slices.find((s) => s.id === previewSliceId);
  const sameViewSlices = modalSlice
    ? slices.filter((s) => s.view === modalSlice.view).sort((a, b) => a.order - b.order)
    : [];
  const modalSliceIndex = modalSlice
    ? sameViewSlices.findIndex((s) => s.id === modalSlice.id)
    : -1;
  const prevModalSlice = modalSliceIndex > 0 ? sameViewSlices[modalSliceIndex - 1] : null;
  const nextModalSlice =
    modalSliceIndex >= 0 && modalSliceIndex < sameViewSlices.length - 1
      ? sameViewSlices[modalSliceIndex + 1]
      : null;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Lightbox Preview Modal */}
      {modalSlice && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
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
                  {modalSlice.view}
                </span>
                <h3 className="text-sm font-semibold text-gray-100 truncate" title={modalSlice.name}>
                  {modalSlice.name}
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  #{modalSlice.order} of {sameViewSlices.length}
                </span>
                {modalSlice.isPriority && (
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
                  alt={modalSlice.name}
                  className="max-h-[60vh] max-w-full object-contain rounded shadow-lg"
                />
              ) : (
                <div className="text-center py-12">
                  <i className="fas fa-file-medical text-5xl text-gray-600 mb-3"></i>
                  <p className="text-sm text-gray-400">Full visual preview not available for non-image file.</p>
                  <p className="text-xs text-gray-500 mt-1">{modalSlice.name} ({formatFileSize(modalSlice.size)})</p>
                </div>
              )}

              {/* Navigation Arrows */}
              {prevModalSlice && (
                <button
                  type="button"
                  onClick={() => setPreviewSliceId(prevModalSlice.id)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white w-10 h-10 rounded-full flex items-center justify-center border border-white/20 transition-transform active:scale-95 shadow-md"
                  title="Previous slice"
                >
                  <i className="fas fa-chevron-left text-lg"></i>
                </button>
              )}
              {nextModalSlice && (
                <button
                  type="button"
                  onClick={() => setPreviewSliceId(nextModalSlice.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white w-10 h-10 rounded-full flex items-center justify-center border border-white/20 transition-transform active:scale-95 shadow-md"
                  title="Next slice"
                >
                  <i className="fas fa-chevron-right text-lg"></i>
                </button>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-gray-800 bg-gray-950 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-gray-400">
                <span>File size: <strong className="text-gray-200">{formatFileSize(modalSlice.size)}</strong></span>
                <span>MRI View: <strong className="text-gray-200 capitalize">{modalSlice.view}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSlicePriority(modalSlice.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    modalSlice.isPriority
                      ? "bg-cyan-950 text-cyan-200 border border-cyan-600/50"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <i className={`fas fa-bookmark ${modalSlice.isPriority ? "text-cyan-400" : "text-slate-400"}`}></i>
                  <span>{modalSlice.isPriority ? "Key Slice Set" : "Mark Key Slice"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSliceId(null)}
                  className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium"
                >
                  Done Previewing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Submit an Artifact</h1>
        <p className="mt-2 text-gray-500">
          Contribute artifact examples and metadata to AURA.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
        {formError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Combined Slice Upload, Drag & Drop, and Preview Canvas */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-images text-brand-500"></i> Artifact Image Slices <span className="text-xs font-normal text-red-600">(Required - at least 1)</span>
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload slice captures by view and tag key diagnostic slices.
                </p>
              </div>

              {/* View Target Selector Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
                {["axial", "coronal", "sagittal"].map((view) => {
                  const count = slices.filter((s) => s.view === view).length;
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
                dragActive ? "border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10" : "border-gray-300 bg-gray-50/40"
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
                  addFiles(e.dataTransfer.files);
                }
              }}
            >
              {slices.length === 0 ? (
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
                    Drag and drop slice series here, or <span className="text-brand-600 font-semibold underline">browse local files</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-2">
                    PNG, JPG, JPEG (max 50MB)
                  </p>
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
                    <span className="text-gray-400 italic">
                      Drag to reorder • Tag key slices
                    </span>
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
                            if (draggedSliceId && draggedSliceId !== slice.id && dragOverSliceId !== slice.id) {
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
                              : slice.isPriority
                              ? "border-slate-400 ring-2 ring-slate-400/15 bg-slate-50/50 shadow-sm"
                              : "border-gray-200 hover:border-brand-300"
                          }`}
                        >
                          {slice.isPriority && (
                            <div className="absolute -top-2.5 left-3 bg-cyan-900 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded shadow-sm flex items-center gap-1 z-10 border border-cyan-700/50">
                              <i className="fas fa-bookmark text-cyan-300"></i> Key Diagnostic Slice
                            </div>
                          )}

                          <div>
                            <div className="flex items-start gap-2.5 mb-3">
                              <i className="fas fa-grip-vertical text-gray-300 mt-5 cursor-grab active:cursor-grabbing hover:text-gray-500" title="Drag card to reorder"></i>

                              {/* Clickable Thumbnail for Full Preview */}
                              <button
                                type="button"
                                onClick={() => setPreviewSliceId(slice.id)}
                                className="w-16 h-16 rounded-lg bg-gray-900 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200 relative group cursor-pointer"
                                title="Click for full preview"
                              >
                                {slice.previewUrl ? (
                                  <img src={slice.previewUrl} alt={slice.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                ) : (
                                  <i className="fas fa-brain text-brand-400 text-xl"></i>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                                  <i className="fas fa-search-plus"></i>
                                </div>
                                <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl">
                                  #{slice.order}
                                </span>
                              </button>

                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-semibold text-gray-900 truncate" title={slice.name}>
                                  {slice.name}
                                </h4>
                                <p className="text-[11px] text-gray-500 mt-0.5">{formatFileSize(slice.size)}</p>

                                <div className="mt-2 flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase font-bold text-gray-400">View:</span>
                                  <select
                                    value={slice.view}
                                    onChange={(e) => updateSliceView(slice.id, e.target.value)}
                                    className="text-xs border border-gray-300 rounded-md py-0.5 px-1.5 bg-white text-gray-800 font-medium focus:ring-brand-500 focus:border-brand-500"
                                  >
                                    <option value="axial">Axial</option>
                                    <option value="coronal">Coronal</option>
                                    <option value="sagittal">Sagittal</option>
                                  </select>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeSlice(slice.id)}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="Remove slice"
                              >
                                <i className="fas fa-times text-sm"></i>
                              </button>
                            </div>
                          </div>

                          {/* Clean Medical Action Toolbar */}
                          <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => toggleSlicePriority(slice.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                slice.isPriority
                                  ? "bg-cyan-900 text-white shadow-xs border border-cyan-700/50"
                                  : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                              }`}
                              title="Toggle Key Slice"
                            >
                              <i className={`fas fa-bookmark text-xs ${slice.isPriority ? "text-cyan-300" : "text-gray-400"}`}></i>
                              <span>Key Slice</span>
                            </button>

                            <div className="flex items-center gap-1">
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
                onChange={handleFileInput}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </div>

          {/* Section 2: Volume Montages (Optional) */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-th text-brand-500"></i> Overview Montages <span className="text-xs font-normal text-gray-500">(Optional)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Upload multi-slice grid montages for each view.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Axial Montage Grid", state: axialMontageFile, setState: setAxialMontageFile, icon: "fa-square" },
                { label: "Coronal Montage Grid", state: coronalMontageFile, setState: setCoronalMontageFile, icon: "fa-border-all" },
                { label: "Sagittal Montage Grid", state: sagittalMontageFile, setState: setSagittalMontageFile, icon: "fa-columns" },
              ].map((item) => (
                <div key={item.label} className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-gray-800">
                      <i className={`fas ${item.icon} text-brand-500`}></i> {item.label}
                    </div>
                    {item.state ? (
                      <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center justify-between">
                        <span className="truncate max-w-[120px] font-medium" title={item.state.name}>
                          {item.state.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => item.setState(null)}
                          className="text-emerald-700 hover:text-red-600 ml-2"
                          title="Remove montage file"
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
                    {item.state ? "Change Image" : "Upload Image"}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          item.setState(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700" htmlFor="artifactName">
                  Artifact Name
                </label>
                {(auraUser?.email || user?.email) && (
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <i className="fas fa-user-circle text-brand-600"></i>
                    <span>Submitting as: <strong className="text-gray-800">{auraUser?.email || user?.email}</strong></span>
                  </span>
                )}
              </div>
              <input
                autoComplete="off"
                className={fieldClass}
                id="artifactName"
                name="artifactName"
                onFocus={() => {
                  if (form.artifactName.trim().length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onChange={(e) => {
                  updateField(e);
                  setShowSuggestions(true);
                  if (autoFilledFrom && e.target.value.toLowerCase() !== autoFilledFrom.toLowerCase()) {
                    setAutoFilledFrom(null);
                  }
                }}
                placeholder="e.g., Zipper Artifact, Fat Shift"
                required
                type="text"
                value={form.artifactName}
              />

              {/* Autocomplete Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 bg-gray-50/90 text-[11px] font-semibold text-gray-500 flex items-center justify-between sticky top-0 z-10 backdrop-blur-xs">
                    <span>Existing Catalog Matches ({filteredSuggestions.length})</span>
                    <span className="text-brand-600 font-medium">Click to auto-fill description</span>
                  </div>
                  {filteredSuggestions.slice(0, 8).map((art) => {
                    const artTitle = art.title || art.name || "Untitled";
                    const artCategory = art.category || art.default_modality || "Artifact";
                    const artDesc = art.description || art.visual_description || art.explanation || "";
                    return (
                      <button
                        key={art.id || artTitle}
                        type="button"
                        className="w-full text-left px-3.5 py-2.5 hover:bg-brand-50/70 focus:bg-brand-50 focus:outline-none transition-colors flex items-start gap-2.5 group cursor-pointer"
                        onClick={() => handleSelectArtifactSuggestion(art)}
                      >
                        <div className="mt-0.5 w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 text-xs group-hover:bg-brand-200 transition-colors">
                          <i className="fas fa-layer-group"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 truncate">
                              {artTitle}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 group-hover:bg-brand-100 group-hover:text-brand-800 flex-shrink-0">
                              {artCategory}
                            </span>
                          </div>
                          {artDesc && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {artDesc}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="modality">
                Modality
              </label>
              <select
                className={fieldClass}
                id="modality"
                name="modality"
                onChange={updateField}
                required
                value={form.modality}
              >
                <option value="">Select Modality</option>
                {modalityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="category">
                Category
              </label>
              <select
                className={fieldClass}
                id="category"
                name="category"
                onChange={updateField}
                required
                value={form.category}
              >
                <option value="">Select Category</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="scanner">
                Scanner
              </label>
              <input
                className={fieldClass}
                id="scanner"
                name="scanner"
                onChange={updateField}
                placeholder="e.g., Scanner 1"
                type="text"
                value={form.scanner}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="sequence">
                Sequence
              </label>
              <input
                className={fieldClass}
                id="sequence"
                name="sequence"
                onChange={updateField}
                placeholder="e.g., 3D GRASE"
                type="text"
                value={form.sequence}
              />
            </div>

            {/* Dynamic Modality Metadata Schema Fields */}
            {form.modality && (
              <div className="sm:col-span-2 rounded-2xl border border-brand-200/80 bg-brand-50/20 p-5 sm:p-6 shadow-xs transition-all">
                <div className="flex flex-wrap items-center justify-between border-b border-brand-100/80 pb-3.5 mb-4 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shadow-2xs">
                      <i className="fas fa-sliders"></i>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-gray-900">
                        {form.modality || "Perfusion"} Acquisition Parameters
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
                    No custom parameters configured for {form.modality}.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {modalitySchemaFields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <label
                            htmlFor={`meta_${field.key}`}
                            className="block text-xs font-bold text-gray-700 truncate"
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
                          <input
                            id={`meta_${field.key}`}
                            type={field.field_type === "number" || field.type === "number" ? "number" : "text"}
                            step="any"
                            value={modalityMetadata[field.key] ?? ""}
                            onChange={(e) => updateModalityMetadata(field.key, e.target.value)}
                            placeholder={field.example ? `e.g., ${field.example}` : `Enter ${field.label.toLowerCase()}...`}
                            className="p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-sm focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="symptoms">
                Observed Symptoms (Tags)
              </label>
              <div className="mt-1 p-2 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus-within:ring-brand-500 focus-within:border-brand-500 shadow-sm transition-colors">
                <div className="flex flex-wrap gap-2">
                  {form.symptoms.map((tag) => (
                    <button
                      key={tag}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-600"
                      onClick={() => removeTag(tag)}
                      type="button"
                    >
                      {tag}
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  ))}
                  <input
                    className="min-w-56 flex-1 border-0 p-1 text-sm text-gray-900 outline-none"
                    id="symptoms"
                    onBlur={commitTagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Type symptom and press Enter (e.g., banding, blur)"
                    type="text"
                    value={tagInput}
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700" htmlFor="description">
                  Description
                </label>
                {autoFilledFrom && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200/80 animate-in fade-in duration-200">
                    <i className="fas fa-check-circle text-brand-600"></i>
                    <span>Auto-filled from <strong>{autoFilledFrom}</strong></span>
                  </span>
                )}
              </div>
              <textarea
                className={fieldClass}
                id="description"
                name="description"
                onChange={(e) => {
                  updateField(e);
                  if (autoFilledFrom) {
                    setAutoFilledFrom(null);
                  }
                }}
                placeholder="Provide background on the scan, how the artifact was identified, and any other relevant context..."
                required
                rows="4"
                value={form.description}
              ></textarea>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="remedies">
                Remedies & Solutions
              </label>
              <textarea
                className={fieldClass}
                id="remedies"
                name="remedies"
                onChange={updateField}
                placeholder="List potential remedies, sequence adjustments, or clinical solutions..."
                rows="4"
                value={form.remedies}
              ></textarea>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="references">
                References
              </label>
              <textarea
                className={fieldClass}
                id="references"
                name="references"
                onChange={updateField}
                placeholder="Add scientific references or citations (one per line)..."
                rows="3"
                value={form.references}
              ></textarea>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="submitterNotes">
                Submitter Notes
              </label>
              <textarea
                className={fieldClass}
                id="submitterNotes"
                name="submitterNotes"
                onChange={updateField}
                placeholder="Anything reviewers should know before triage..."
                rows="3"
                value={form.submitterNotes}
              ></textarea>
            </div>


          </div>

          <div className="pt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link to="/" className="bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-colors mr-4 text-center">
              Cancel
            </Link>
            <button
              type="submit"
              value="draft"
              disabled={submitting}
              className="bg-white border border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl shadow-sm transition-colors hover:bg-gray-50 active:scale-95 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && submitAction === "draft" ? "Saving..." : "Save as Draft"} <i className={`fas ${submitting && submitAction === "draft" ? "fa-spinner fa-spin" : "fa-save"}`}></i>
            </button>
            <button
              type="submit"
              value="publish"
              disabled={submitting}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-6 rounded-xl ml-3 shadow-lg shadow-brand-500/30 transition-transform active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && submitAction === "publish" ? "Publishing..." : "Publish Artifact"} <i className={`fas ${submitting && submitAction === "publish" ? "fa-spinner fa-spin" : "fa-paper-plane"}`}></i>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Submission;

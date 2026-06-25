import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { createSubmission } from "../services/api";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 8;
const ACCEPTED_EXTENSIONS = [".dcm", ".dicom", ".nii", ".nii.gz", ".png", ".jpg", ".jpeg"];

const INITIAL_FORM = {
  artifactName: "",
  contactEmail: "",
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
  permissionConfirmed: false,
  pseudonymisationConfirmed: false,
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

const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

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

const validateSubmission = (form) => {
  if (!form.artifactName.trim()) {
    return "Artifact name is required.";
  }
  if (!form.contactEmail.trim()) {
    return "Contact email is required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
    return "Enter a valid contact email address.";
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
  if (!form.permissionConfirmed || !form.pseudonymisationConfirmed) {
    return "Confirm permission and pseudonymisation before submitting.";
  }
  return "";
};

function Submission() {
  const {
    isAuthenticated,
    isSupabaseConfigured,
    loading: authLoading,
    signInWithEmail,
    user,
  } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [files, setFiles] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [signInNotice, setSignInNotice] = useState("");

  const updateField = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setFiles([]);
    setTagInput("");
    setFormError("");
    setReceipt(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addFiles = (fileList) => {
    const incomingFiles = Array.from(fileList || []);
    if (incomingFiles.length === 0) {
      return;
    }

    const existingKeys = new Set(files.map(fileKey));
    const nextFiles = [...files];
    let rejection = "";

    incomingFiles.forEach((file) => {
      if (nextFiles.length >= MAX_FILES) {
        rejection = `Upload no more than ${MAX_FILES} files per submission.`;
        return;
      }
      if (!isSupportedUpload(file)) {
        rejection = `${file.name} is not a supported file type.`;
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejection = `${file.name} is larger than 50MB.`;
        return;
      }

      const key = fileKey(file);
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        nextFiles.push(file);
      }
    });

    setFiles(nextFiles);
    setFormError(rejection);
  };

  const handleFileInput = (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const removeFile = (keyToRemove) => {
    setFiles((current) => current.filter((file) => fileKey(file) !== keyToRemove));
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

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setSignInBusy(true);
    setSignInError("");
    setSignInNotice("");

    try {
      await signInWithEmail(signInEmail.trim());
      setSignInNotice("Magic link sent. Check your email, then return here.");
    } catch (error) {
      setSignInError(error.message || "Sign-in failed.");
    } finally {
      setSignInBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (authLoading) {
      setFormError("Checking your sign-in status. Try again in a moment.");
      return;
    }
    if (!isSupabaseConfigured) {
      setFormError("Sign-in is not configured for this environment.");
      return;
    }
    if (!isAuthenticated) {
      setFormError("Sign in before submitting an artifact.");
      return;
    }

    const symptomsForSubmit = normaliseTags([...form.symptoms, tagInput]);
    const payload = { ...form, symptoms: symptomsForSubmit };
    const validationError = validateSubmission(payload);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const submissionReceipt = await createSubmission({
        ...payload,
        files,
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
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Submit an Artifact</h1>
          <p className="mt-2 text-gray-500">Sign in to publish an artifact from your AURA account.</p>
        </div>

        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">Sign in required</h2>
            <p className="mt-1 text-sm text-gray-500">Only authenticated contributors can submit artifacts.</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
              Sign-in is not configured for this environment.
            </div>
          )}

          {signInError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {signInError}
            </div>
          )}

          {signInNotice && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              {signInNotice}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSignIn}>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="submit-signin-email">
                Email
              </label>
              <input
                autoComplete="email"
                className={fieldClass}
                id="submit-signin-email"
                name="email"
                onChange={(event) => setSignInEmail(event.target.value)}
                required
                type="email"
                value={signInEmail}
              />
            </div>

            <button
              className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={signInBusy || !isSupabaseConfigured}
              type="submit"
            >
              {signInBusy ? "Sending..." : "Send magic link"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (receipt) {
    return (
      <div id="submit-success" className="py-12 text-center animate-fade-in max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check text-3xl text-green-600"></i>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Submission Received!</h3>
        <p className="text-gray-500 max-w-sm mx-auto mb-8">Your artifact is published to the community and linked to your account.</p>
        <p className="text-xs text-gray-400 max-w-sm mx-auto mb-8">Receipt ID: {receipt.id}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button onClick={resetForm} className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-8 rounded-xl transition-colors shadow-lg shadow-brand-500/30" type="button">
            Submit Another
          </button>
          <Link to={`/artifact/${receipt.artifact?.id}`} className="bg-white border border-gray-300 text-gray-700 py-3 px-8 rounded-xl font-medium hover:bg-gray-50 transition-colors text-center">
            View Artifact
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Submit an Artifact</h1>
            <p className="mt-2 text-gray-500">Publishing as {user?.email || "your AURA account"}.</p>
        </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
        {formError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images <span className="text-gray-400">(Optional)</span></label>
            <div
              className={`mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-dashed rounded-xl transition-colors cursor-pointer group ${
                dragActive ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex="0"
            >
              <div className="space-y-2 text-center">
                <div className="mx-auto w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <i className="fas fa-cloud-upload-alt text-2xl text-brand-500"></i>
                </div>
                <div className="flex text-sm text-gray-600 justify-center">
                  <span className="relative rounded-md font-medium text-brand-600">
                    Upload files
                  </span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">DICOM, NIfTI, PNG, JPG up to 50MB</p>
              </div>
              <input
                accept={ACCEPTED_EXTENSIONS.join(",")}
                className="sr-only"
                multiple
                onChange={handleFileInput}
                ref={fileInputRef}
                type="file"
              />
            </div>

            {files.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {files.map((file) => (
                  <button
                    key={fileKey(file)}
                    className="max-w-full rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600"
                    onClick={() => removeFile(fileKey(file))}
                    title="Remove file"
                    type="button"
                  >
                    <span className="mr-2">{file.name}</span>
                    <span className="text-gray-400">{formatFileSize(file.size)}</span>
                    <i className="fas fa-times ml-2"></i>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="artifactName">
                Artifact Name
              </label>
              <input
                className={fieldClass}
                id="artifactName"
                name="artifactName"
                onChange={updateField}
                placeholder="e.g., Zipper Artifact"
                required
                type="text"
                value={form.artifactName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="contactEmail">
                Contact Email
              </label>
              <input
                className={fieldClass}
                id="contactEmail"
                name="contactEmail"
                onChange={updateField}
                placeholder="e.g., researcher@example.org"
                required
                type="email"
                value={form.contactEmail}
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
              <label className="block text-sm font-medium text-gray-700" htmlFor="description">
                Description
              </label>
              <textarea
                className={fieldClass}
                id="description"
                name="description"
                onChange={updateField}
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

            <div className="sm:col-span-2 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="flex gap-3 text-sm text-gray-700">
                <input
                  checked={form.permissionConfirmed}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  name="permissionConfirmed"
                  onChange={updateField}
                  required
                  type="checkbox"
                />
                <span>I have permission to submit these files for review.</span>
              </label>

              <label className="flex gap-3 text-sm text-gray-700">
                <input
                  checked={form.pseudonymisationConfirmed}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  name="pseudonymisationConfirmed"
                  onChange={updateField}
                  required
                  type="checkbox"
                />
                <span>The uploaded files are pseudonymised.</span>
              </label>
            </div>
          </div>

          <div className="pt-5 flex justify-end">
            <Link to="/" className="bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-colors mr-4 text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-6 rounded-xl ml-3 shadow-lg shadow-brand-500/30 transition-transform active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Submitting..." : "Publish Artifact"} <i className={`fas ${submitting ? "fa-spinner fa-spin" : "fa-paper-plane"}`}></i>
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
}

export default Submission;

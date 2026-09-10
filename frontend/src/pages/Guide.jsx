import { useState } from "react";
import { Link } from "react-router-dom";

const DEMO_MODALITY_SCHEMAS = {
  ASL: [
    { label: "Parameter 1", unit: "unit", key: "parameter_1", type: "number", required: true },
    { label: "Parameter 2", unit: "", key: "parameter_2", type: "text", required: false },
    { label: "Parameter 3", unit: "", key: "parameter_3", type: "boolean", required: false },
  ],
  DSC: [
    { label: "Parameter 1", unit: "unit", key: "parameter_1", type: "number", required: true },
    { label: "Parameter 2", unit: "", key: "parameter_2", type: "text", required: false },
    { label: "Parameter 3", unit: "", key: "parameter_3", type: "boolean", required: false },
  ],
  DCE: [
    { label: "Parameter 1", unit: "unit", key: "parameter_1", type: "number", required: true },
    { label: "Parameter 2", unit: "", key: "parameter_2", type: "text", required: false },
    { label: "Parameter 3", unit: "", key: "parameter_3", type: "boolean", required: false },
  ],
  IVIM: [
    { label: "Parameter 1", unit: "unit", key: "parameter_1", type: "number", required: true },
    { label: "Parameter 2", unit: "", key: "parameter_2", type: "text", required: false },
    { label: "Parameter 3", unit: "", key: "parameter_3", type: "boolean", required: false },
  ],
};

export default function Guide() {
  const [activeRole, setActiveRole] = useState("contributor");
  const [demoModality, setDemoModality] = useState("ASL");

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 pt-8 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Simple Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 mb-3">
            <i className="fas fa-book-open"></i> OSIPI Platform Guide
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            How to Use AURA
          </h1>
          <p className="mt-2 text-base text-gray-600 max-w-xl mx-auto">
            A simple, step-by-step guide on how to contribute scans and moderate artifacts on the platform.
          </p>

          {/* Simple 2-Role Toggle */}
          <div className="mt-6 inline-flex p-1.5 bg-white border border-gray-200 rounded-2xl shadow-xs">
            <button
              onClick={() => setActiveRole("contributor")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeRole === "contributor"
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-upload text-sm"></i>
              As a Contributor
            </button>
            <button
              onClick={() => setActiveRole("admin")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeRole === "admin"
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-shield-halved text-sm"></i>
              As an Admin / Reviewer
            </button>
          </div>
        </div>

        {/* ----------------- CONTRIBUTOR VIEW ----------------- */}
        {activeRole === "contributor" && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick Summary Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <i className="fas fa-circle-info text-brand-600"></i> What can a Contributor do?
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Contributors (researchers, radiologists, imaging technicians) can upload perfusion MRI artifact examples, provide scanner settings, write clinical solutions, and track peer-review feedback.
              </p>
            </div>

            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Sign in to your account</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Click <strong>Sign in</strong> in the top-right corner. You need to be logged in so your submissions are linked to your profile.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                2
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Go to "Submit Artifact"</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Click the <strong>Submit Artifact</strong> button in the navigation bar to open the submission wizard.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                3
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Fill in artifact details & scanner parameters</h3>
                <ul className="text-sm text-gray-600 mt-2 space-y-1.5 list-disc list-inside">
                  <li><strong>Artifact Title & Modality:</strong> Select ASL, DSC, DCE, or IVIM.</li>
                  <li><strong>Dynamic Parameters:</strong> Form fields adapt automatically to your selected modality.</li>
                  <li><strong>Description:</strong> What is visible in the image and why it happened.</li>
                  <li><strong>Scanner Remedy:</strong> What protocol adjustments can fix or avoid this artifact.</li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                4
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Upload scan images (Anonymized)</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Drag and drop scan slice images (PNG, JPG, JPEG). You can upload multiple slices and reorder them to select the most representative artifact slice.
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <i className="fas fa-triangle-exclamation text-amber-600"></i>
                  <span><strong>Important:</strong> Please ensure scans are fully anonymized with no patient names or hospital IDs.</span>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                5
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Track under "My Submissions"</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Once submitted, view your scan in <Link to="/profile" className="text-brand-600 underline font-medium">My Submissions</Link>. You can track whether your case is <em>Live</em>, awarded <em>OSIPI Verified</em>, saved as a <em>Draft</em>, or <em>Flagged</em> with reviewer feedback.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ADMIN / REVIEWER VIEW ----------------- */}
        {activeRole === "admin" && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick Summary Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <i className="fas fa-shield-halved text-brand-600"></i> What can an Admin / Reviewer do?
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Admins and Reviewers ensure scientific quality and platform maintenance: reviewing submitted artifacts, verifying compliant cases, flagging items for revisions, and customizing scanner metadata fields without code.
              </p>
            </div>

            {/* Admin Feature 1 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Accessing the Admin Panel</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Users with reviewer or admin rights will see the <strong>Admin Panel</strong> link in the top navigation bar. Click it to open the moderation dashboard.
                </p>
              </div>
            </div>

            {/* Admin Feature 2 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                2
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Reviewing Pending Submissions</h3>
                <p className="text-sm text-gray-600 mt-1">
                  In the <strong>Artifact Moderation</strong> tab (under the <em>Needs Review (Queue)</em> filter), click any pending case to inspect:
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1.5 list-disc list-inside">
                  <li>The uploaded scan slice images and slice ordering.</li>
                  <li>Scan parameters (Vendor, Modality, Sequence, Timings).</li>
                  <li>The description and suggested remedy.</li>
                  <li>Verification that no patient data is visible.</li>
                </ul>
              </div>
            </div>

            {/* Admin Feature 3 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                3
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Verification, Flagging & Feedback</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-800 text-xs flex items-center gap-1 mb-1">
                      <i className="fas fa-check-double"></i> Verify OSIPI
                    </span>
                    <p className="text-xs text-emerald-700">Validates the artifact and awards it the official <strong>OSIPI Verified</strong> badge in the public catalog.</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-800 text-xs flex items-center gap-1 mb-1">
                      <i className="fas fa-flag"></i> Flag for Changes
                    </span>
                    <p className="text-xs text-amber-700">Sends feedback to the contributor requesting missing scanner details or clearer slices.</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="font-bold text-rose-800 text-xs flex items-center gap-1 mb-1">
                      <i className="fas fa-xmark"></i> Reject
                    </span>
                    <p className="text-xs text-rose-700">Declines non-compliant or corrupted submissions.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Feature 4: Modality Metadata Manager with Visual Guide */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                  4
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Modality Metadata Manager (No-Code Schema Editor)</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Perfusion MRI sequences have specialized parameters that differ by technique (e.g. Post-Labeling Delay for ASL vs. b-values for IVIM). Administrators can customize and extend these fields dynamically without writing any code or modifying the database schema.
                  </p>
                </div>
              </div>

              {/* 3-Step Process Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black">A</span>
                    Select Modality
                  </div>
                  <p className="text-xs text-gray-600">Switch between ASL, DSC, DCE, or IVIM to manage modality-specific parameters.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black">B</span>
                    Define Field Schema
                  </div>
                  <p className="text-xs text-gray-600">Set the field label, unit (e.g., ms, s/mm²), data type (number, text), and required flag.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black">C</span>
                    Instant Form Sync
                  </div>
                  <p className="text-xs text-gray-600">Saved fields immediately appear on the contributor submission form under that modality.</p>
                </div>
              </div>

              {/* Interactive Visual Simulator */}
              <div className="rounded-2xl border border-gray-200/90 bg-gradient-to-b from-gray-50/70 to-slate-50/40 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
                  <div>
                    <span className="text-xs font-bold text-brand-600 tracking-wide uppercase flex items-center gap-1.5">
                      <i className="fas fa-sliders text-xs"></i> Interactive Simulator
                    </span>
                    <h4 className="text-sm font-extrabold text-gray-900 mt-0.5">
                      Modality Technique Metadata Schema
                    </h4>
                  </div>

                  {/* Modality Selector Tabs (Interactive) */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                    {["ASL", "DSC", "DCE", "IVIM"].map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setDemoModality(mod)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          demoModality === mod
                            ? "bg-brand-600 text-white shadow-xs"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Schema View */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left: Configured Fields */}
                  <div className="lg:col-span-2 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Configured {demoModality} Fields ({(DEMO_MODALITY_SCHEMAS[demoModality] || []).length})
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        stored in jsonb
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(DEMO_MODALITY_SCHEMAS[demoModality] || []).map((field, idx) => (
                        <div
                          key={field.key}
                          className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-3 shadow-2xs hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900">
                                {field.label} {field.unit && <span className="text-gray-500 font-normal">({field.unit})</span>}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                key: {field.key} • {field.type}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {field.required ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                Required
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                Optional
                              </span>
                            )}
                            <span className="text-xs text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 cursor-not-allowed" title="Simulated action">
                              <i className="fas fa-pen text-[10px]"></i>
                            </span>
                            <span className="text-xs text-red-400 px-1.5 py-0.5 rounded border border-red-100 bg-red-50 cursor-not-allowed" title="Simulated action">
                              <i className="fas fa-trash text-[10px]"></i>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Mock Add Field Form */}
                  <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs space-y-2.5">
                    <div className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fas fa-plus-circle text-brand-600"></i> Add to {demoModality}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Field Label</label>
                        <input
                          type="text"
                          disabled
                          readOnly
                          placeholder="e.g. Dummy Parameter"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Unit</label>
                          <input
                            type="text"
                            disabled
                            readOnly
                            placeholder="e.g. unit"
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Type</label>
                          <div className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 flex justify-between items-center cursor-not-allowed">
                            <span>Number</span>
                            <i className="fas fa-chevron-down text-[10px] text-gray-400"></i>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input type="checkbox" disabled checked readOnly className="rounded text-brand-600" />
                        <span className="text-[11px] text-gray-600">Required parameter</span>
                      </div>

                      <button
                        type="button"
                        disabled
                        className="w-full mt-1 py-1.5 rounded-lg bg-brand-600/80 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                      >
                        <i className="fas fa-plus text-[10px]"></i> Add Field to Schema
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visual Impact on Contributor Form */}
                <div className="mt-4 pt-3 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                      ✓
                    </span>
                    <span>
                      <strong>Dynamic Form Sync:</strong> When a researcher selects <strong>{demoModality}</strong> on the submission form, these exact fields render instantly.
                    </span>
                  </div>
                  <Link
                    to="/submit"
                    className="text-brand-600 hover:text-brand-700 font-semibold underline flex items-center gap-1 flex-shrink-0 text-xs"
                  >
                    View Submission Form <i className="fas fa-arrow-right text-[10px]"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links Footer */}
        <div className="mt-12 text-center border-t border-gray-200/80 pt-6">
          <p className="text-sm text-gray-500">
            Have questions or need reviewer access? Reach out on the <strong>OSIPI Slack</strong> or contact Taskforce AURA.
          </p>
        </div>
      </div>
    </div>
  );
}

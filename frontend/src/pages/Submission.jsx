import { useState } from "react";
import { Link } from "react-router-dom";

function Submission() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div id="submit-success" className="py-12 text-center animate-fade-in max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check text-3xl text-green-600"></i>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Submission Received!</h3>
        <p className="text-gray-500 max-w-sm mx-auto mb-8">Your artifact has been sent to the reviewer queue. You'll be notified once it's approved and published.</p>
        <button onClick={() => setSubmitted(false)} className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-8 rounded-xl transition-colors shadow-lg shadow-brand-500/30">
            Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Submit an Artifact</h1>
            <p className="mt-2 text-gray-500">Help grow the repository by submitting artifact examples for review.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Image Upload Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images</label>
                    <div className="mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="space-y-2 text-center">
                            <div className="mx-auto w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <i className="fas fa-cloud-upload-alt text-2xl text-brand-500"></i>
                            </div>
                            <div className="flex text-sm text-gray-600 justify-center">
                                <label className="relative cursor-pointer rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                                    <span>Upload files</span>
                                    <input type="file" className="sr-only" multiple />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">DICOM, NIfTI, PNG, JPG up to 50MB</p>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Artifact Name</label>
                        <input type="text" placeholder="e.g., Zipper Artifact" className="mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Modality</label>
                        <select className="mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors" required>
                            <option value="">Select Modality</option>
                            <option>ASL</option>
                            <option>DSC</option>
                            <option>DCE</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select className="mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors" required>
                            <option value="">Select Category</option>
                            <option>Motion</option>
                            <option>Susceptibility</option>
                            <option>Hardware/RF</option>
                            <option>Flow</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Scanner</label>
                        <input type="text" placeholder="e.g., Scanner 1" className="mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sequence</label>
                        <input type="text" placeholder="e.g., 3D GRASE" className="mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors" />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Observed Symptoms (Tags)</label>
                        <input type="text" placeholder="Type symptom and press Enter (e.g., banding, blur)" className="mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors" />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea rows="4" className="mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors" placeholder="Provide background on the scan, how the artifact was identified, and any other relevant context..." required></textarea>
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Remedies & Solutions</label>
                        <textarea rows="4" className="mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors" placeholder="List potential remedies, sequence adjustments, or clinical solutions..."></textarea>
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">References</label>
                        <textarea rows="3" className="mt-1 p-3 block w-full rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-colors" placeholder="Add scientific references or citations (one per line)..."></textarea>
                    </div>
                </div>

                <div className="pt-5 flex justify-end">
                    <Link to="/" className="bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-colors mr-4 text-center">
                        Cancel
                    </Link>
                    <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-6 rounded-xl ml-3 shadow-lg shadow-brand-500/30 transition-transform active:scale-95 flex items-center gap-2">
                        Submit for Review <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
}

export default Submission;

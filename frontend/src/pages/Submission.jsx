import { useState } from "react";
import "./Submission.css";

function Submission() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // In a real app, this would handle file uploads and data submission
  };

  if (submitted) {
    return (
      <div className="submission-success text-center animate-fade-in" style={{padding: '5rem 0'}}>
        <div className="success-icon" style={{fontSize: '4rem', color: 'var(--primary-vibrant)', marginBottom: '1rem'}}>✓</div>
        <h2>Thank you for your contribution!</h2>
        <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>Your submission has been received and will be reviewed by our team.</p>
        <button className="btn btn-primary" onClick={() => setSubmitted(false)}>Submit Another Artifact</button>
      </div>
    );
  }

  return (
    <div className="submission-page animate-fade-in">
      <div className="page-header" style={{marginBottom: '2.5rem'}}>
        <h1>Contribute Artifact</h1>
        <p style={{color: 'var(--text-muted)', fontSize: '1.1rem'}}>Help us grow the database by sharing your findings with the research community.</p>
      </div>

      <div className="submission-form-container card" style={{padding: '2.5rem', maxWidth: '800px'}}>
        <form onSubmit={handleSubmit} className="submission-form">
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            <div className="form-group">
              <label htmlFor="name">Artifact Name</label>
              <input type="text" id="name" placeholder="e.g. Chemical Shift (Type I)" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="modality">Modality</label>
                <select id="modality" required>
                  <option value="">Select Modality</option>
                  <option value="DSC">DSC (Dynamic Susceptibility Contrast)</option>
                  <option value="DCE">DCE (Dynamic Contrast Enhanced)</option>
                  <option value="ASL">ASL (Arterial Spin Labeling)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select id="category" required>
                  <option value="">Select Category</option>
                  <option value="Patient-related">Patient-related</option>
                  <option value="System-related">System-related</option>
                  <option value="Protocol-related">Protocol-related</option>
                  <option value="Post-processing">Post-processing</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Clinical & Technical Details</h3>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea id="description" rows="3" placeholder="Describe the artifact and its manifestation..." required></textarea>
            </div>
            <div className="form-group">
              <label htmlFor="symptoms">Symptoms (comma separated)</label>
              <input type="text" id="symptoms" placeholder="e.g. Signal drop, blur, periodic noise" />
            </div>
            <div className="form-group">
              <label htmlFor="scanner">Scanner Model / Info</label>
              <input type="text" id="scanner" placeholder="e.g. Siemens Skyra 3T / GE Signa Artist" />
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Visual Evidence</h3>
            <div className="file-upload-zone">
              <div className="upload-content">
                <span className="upload-icon">↑</span>
                <p>Drag and drop artifact images here</p>
                <p className="upload-hint">Supported formats: JPG, PNG, DICOM (Max 10MB per file)</p>
              </div>
              <input type="file" multiple className="file-input-hidden" />
              <button type="button" className="btn" style={{border: '1px solid var(--border-light)'}}>Choose Files</button>
            </div>
          </div>

          <div className="form-actions" style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
            <button type="button" className="btn" style={{backgroundColor: '#e9ecef'}}>Cancel</button>
            <button type="submit" className="btn btn-accent">Submit Artifact</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Submission;

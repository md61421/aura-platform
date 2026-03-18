import { useParams, Link } from "react-router-dom";
import data from "../data.json";
import { useState } from "react";
import "./Detail.css";


function Detail() {
  const { id } = useParams();
  const artifact = data.find((a) => a.id === parseInt(id));
  const [activeImg, setActiveImg] = useState(0);

  if (!artifact) return <div className="container" style={{padding: '5rem 0', textAlign: 'center'}}><h2>Artifact not found</h2><Link to="/">Back to Library</Link></div>;

  return (
    <div className="detail-page animate-fade-in">
      <Link to="/" className="btn" style={{marginBottom: '2rem', padding: '0.5rem 0', fontWeight: 600, color: 'var(--primary-vibrant)'}}>
        &larr; Back to Library
      </Link>

      <div className="artifact-detail-header" style={{marginBottom: '1.5rem'}}>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.25rem'}}>
          {artifact.modality && <span className="badge" style={{background: 'var(--primary-deep)', color: 'white'}}>{artifact.modality}</span>}
          <span className="badge">{artifact.category}</span>
        </div>
        <h1 style={{fontSize: '1.8rem', marginBottom: '0.25rem'}}>{artifact.name}</h1>
        <p style={{fontSize: '1rem', color: 'var(--text-muted)'}}>{artifact.description}</p>
      </div>



      <div className="detail-grid">
        <div className="gallery-section">
          <div className="main-image-container card">
            <img 
              src={artifact.examples[activeImg]} 
              alt={artifact.name} 
              className="main-image"
            />
          </div>
          <div className="thumbnail-grid">


            {artifact.examples.map((img, idx) => (
              <div 
                key={idx} 
                className="thumbnail-item card"
                style={{
                  cursor: 'pointer', 
                  padding: '4px', 
                  borderColor: activeImg === idx ? 'var(--primary-vibrant)' : 'var(--border-light)',
                  borderWidth: activeImg === idx ? '2px' : '1px'
                }}
                onClick={() => setActiveImg(idx)}
              >
                <img src={img} alt="" style={{width: '100%', height: 'auto', borderRadius: '2px'}} />
              </div>
            ))}
          </div>
        </div>

        <div className="info-section">
          <div className="info-card card">


            <h3 className="section-title">Artifact Profile</h3>
            
            <div className="info-item" style={{marginBottom: '1.5rem'}}>
              <h4 style={{fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Symptoms</h4>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
                {artifact.symptoms.map(s => <span key={s} className="badge" style={{background: '#f8f9fa', color: 'var(--primary-deep)'}}>{s}</span>)}
              </div>
            </div>

            <div className="info-item" style={{marginBottom: '1.5rem'}}>
              <h4 style={{fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Causes</h4>
              <p style={{fontSize: '1rem'}}>{artifact.explanation || "N/A"}</p>
            </div>

            <div className="info-item" style={{marginBottom: '1.5rem'}}>
              <h4 style={{fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Solutions</h4>
              {Array.isArray(artifact.remedies) ? (
                <ul style={{paddingLeft: '1.2rem'}}>
                  {artifact.remedies.map((s, i) => <li key={i} style={{marginBottom: '0.5rem'}}>{s}</li>)}
                </ul>
              ) : (
                <p style={{fontSize: '1rem'}}>{artifact.remedies || "N/A"}</p>
              )}
            </div>


            <div className="info-item">
              <h4 style={{fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Scanner Information</h4>
              <p style={{fontStyle: 'italic', color: 'var(--text-muted)'}}>{artifact.scannerInfo || "Generic multi-vendor artifact"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Detail;

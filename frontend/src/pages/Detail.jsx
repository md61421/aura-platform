import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import data from "../data.json";

function Detail() {
  const { id } = useParams();
  // Fix: Find artifact by unique ID instead of array index
  const artifact = data.find(a => a.id === parseInt(id));
  const [activeImg, setActiveImg] = useState(0);

  if (!artifact) {
    return (
      <div className="app-container">
        <Link to="/" className="back-btn">← Back to Gallery</Link>
        <h1>Artifact Not Found</h1>
      </div>
    );
  }

  return (
    <div className="app-container animate-fade-in">
      <Link to="/" className="back-btn">← Back to Gallery</Link>
      
      <header style={{ marginBottom: '1.5rem' }}>
        <span className="artifact-category">{artifact.category}</span>
        <h1 style={{ fontSize: '2rem', marginTop: '0.25rem' }}>{artifact.name}</h1>
      </header>

      <div className="detail-container">
        <div className="detail-gallery">
          <img 
            src={artifact.examples[activeImg]} 
            alt={artifact.name} 
            className="detail-main-image animate-fade-in"
            key={activeImg}
          />
          <div className="detail-thumbnails">
            {artifact.examples.map((img, i) => (
              <img 
                key={i} 
                src={img} 
                className={`thumbnail ${activeImg === i ? 'active' : ''}`}
                onClick={() => setActiveImg(i)}
                alt="thumbnail"
              />
            ))}
          </div>
        </div>

        <div className="detail-content">
          <div className="detail-section">
            <h2>Description</h2>
            <p>{artifact.description}</p>
          </div>

          <div className="detail-section glass" style={{ padding: '1.5rem' }}>
            <h2>Scientific Explanation</h2>
            <p>{artifact.explanation}</p>
          </div>

          <div className="detail-section">
            <h2>Recommended Remedies</h2>
            <p>{artifact.remedies}</p>
          </div>

          <div className="detail-section">
            <h2>Common Symptoms</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {artifact.symptoms.map((s, i) => (
                <span key={i} className="glass" style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.9rem' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Detail;

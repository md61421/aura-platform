import { Link } from "react-router-dom";
import "./ArtifactCard.css";

function ArtifactCard({ artifact }) {
  return (
    <Link to={`/artifact/${artifact.id}`} className="artifact-card-link">
      <article className="artifact-card card">
        <div className="artifact-thumbnail">
          <img src={artifact.examples[0]} alt={artifact.name} />
          <div className="artifact-tags">
            <span className="badge">{artifact.category}</span>
          </div>
        </div>
        <div className="artifact-details">
          <h3 className="artifact-title">{artifact.name}</h3>
          <p className="artifact-excerpt">
            {artifact.description.substring(0, 80)}...
          </p>
          <div className="artifact-meta">
            <span className="meta-modality">{artifact.modality}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default ArtifactCard;

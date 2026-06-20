import { useParams, Link, useNavigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react";
import { getCategoryStyles } from "../utils/helpers";
import { fetchArtifactById } from "../services/api";
import ImageGallery from "../components/ImageGallery";

const NiftiViewer = lazy(() => import("../components/NiftiViewer"));

function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artifact, setArtifact] = useState(null);
  const [loadedArtifactId, setLoadedArtifactId] = useState(null);
  const [mediaView, setMediaView] = useState("images");

  // Voting states
  const [agreements, setAgreements] = useState(0);
  const [disagreements, setDisagreements] = useState(0);
  const [userVote, setUserVote] = useState(null); // 'agree', 'disagree', or null
  const [voteFeedback, setVoteFeedback] = useState(null);

  useEffect(() => {
    let active = true;

    fetchArtifactById(id).then((data) => {
      if (active) {
        setArtifact(data);

        if (data) {
          setMediaView(
            data.examples?.length || !data.niftiVolumes?.length ? "images" : "volume",
          );

          const storedVote = localStorage.getItem(`aura_user_vote_${data.id}`);
          const storedAgreements = localStorage.getItem(
            `aura_agreements_${data.id}`,
          );
          const storedDisagreements = localStorage.getItem(
            `aura_disagreements_${data.id}`,
          );

          setUserVote(storedVote);
          setAgreements(
            storedAgreements !== null
              ? parseInt(storedAgreements)
              : data.agreements || 0,
          );
          setDisagreements(
            storedDisagreements !== null
              ? parseInt(storedDisagreements)
              : data.disagreements || 0,
          );
        } else {
          setUserVote(null);
          setAgreements(0);
          setDisagreements(0);
        }

        setLoadedArtifactId(id);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  const isLoading = loadedArtifactId !== id;

  if (isLoading) {
    return (
      <div className="text-center py-20 text-gray-500">Loading details...</div>
    );
  }

  if (!artifact)
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Artifact not found</h2>
        <Link to="/" className="text-brand-500 hover:underline">
          Back to Library
        </Link>
      </div>
    );

  const { badge, placeholder } = getCategoryStyles(artifact?.category);
  const hasImages = Boolean(artifact.examples?.length);
  const hasNiftiVolumes = Boolean(artifact.niftiVolumes?.length);
  const activeMediaView =
    mediaView === "volume" && hasNiftiVolumes ? "volume" : "images";

  // Dynamic calculations for voting
  const reliability = agreements - disagreements;
  const totalVotes = agreements + disagreements;
  const consensusPercentage =
    totalVotes > 0 ? Math.round((agreements / totalVotes) * 100) : 100;

  // High-fidelity validation status
  const isVerified =
    (artifact.status === "OSIPI Verified" && reliability >= 0) ||
    reliability >= 15;
  const isFlagged = reliability < 0;
  const visibleSymptoms = artifact.symptoms?.length
    ? artifact.symptoms
    : artifact.aliases?.length
      ? artifact.aliases
      : ["General artifact"];

  const handleVote = (voteType) => {
    let newVote = null;
    let newAgreements = agreements;
    let newDisagreements = disagreements;

    if (userVote === voteType) {
      // User is undoing their existing vote
      newVote = null;
      if (voteType === "agree") {
        newAgreements = Math.max(0, agreements - 1);
      } else {
        newDisagreements = Math.max(0, disagreements - 1);
      }
    } else {
      // User is casting a new vote or changing their existing vote
      if (userVote === "agree") {
        newAgreements = Math.max(0, agreements - 1);
      } else if (userVote === "disagree") {
        newDisagreements = Math.max(0, disagreements - 1);
      }

      newVote = voteType;
      if (voteType === "agree") {
        newAgreements += 1;
      } else {
        newDisagreements += 1;
      }
    }

    // Save states locally
    setUserVote(newVote);
    setAgreements(newAgreements);
    setDisagreements(newDisagreements);

    // Save to localStorage to persist user vote simulation
    if (newVote === null) {
      localStorage.removeItem(`aura_user_vote_${artifact.id}`);
    } else {
      localStorage.setItem(`aura_user_vote_${artifact.id}`, newVote);
    }
    localStorage.setItem(`aura_agreements_${artifact.id}`, newAgreements);
    localStorage.setItem(`aura_disagreements_${artifact.id}`, newDisagreements);

    // Trigger visual message feedback
    setVoteFeedback(
      voteType === newVote
        ? `Vote Registered: ${voteType === "agree" ? "Agree" : "Disagree"}`
        : "Vote Retracted",
    );
    setTimeout(() => setVoteFeedback(null), 2000);
  };

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate("/")}
        className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <i className="fas fa-arrow-left mr-2"></i> Back to Browse
      </button>

      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200 lg:h-[calc(100vh-160px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
          {/* Image Gallery Area */}
          <div className="p-6 lg:p-8 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col gap-4 overflow-hidden">
            {hasNiftiVolumes && (
              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeMediaView === "images"
                      ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                      : "text-gray-500 hover:bg-white/70"
                  }`}
                  onClick={() => setMediaView("images")}
                  type="button"
                >
                  Images {hasImages ? `(${artifact.examples.length})` : ""}
                </button>
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeMediaView === "volume"
                      ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                      : "text-gray-500 hover:bg-white/70"
                  }`}
                  onClick={() => setMediaView("volume")}
                  type="button"
                >
                  NIfTI {artifact.niftiVolumes.length > 1 ? `(${artifact.niftiVolumes.length})` : ""}
                </button>
              </div>
            )}

            {activeMediaView === "volume" ? (
              <Suspense
                fallback={
                  <div className="flex min-h-[28rem] items-center justify-center rounded-2xl bg-slate-950 text-sm font-medium text-slate-300">
                    Loading NIfTI viewer...
                  </div>
                }
              >
                <NiftiViewer title={artifact.name} volumes={artifact.niftiVolumes} />
              </Suspense>
            ) : (
              <ImageGallery artifact={artifact} placeholder={placeholder} />
            )}
          </div>

          {/* Content Area */}
          <div className="p-6 lg:p-8 flex flex-col lg:overflow-y-auto w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide mb-3 uppercase ${badge}`}
                >
                  {artifact.category}
                </span>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                  {artifact.name}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-brand-600 hover:border-brand-300 transition-colors"
                  title="Bookmark"
                >
                  <i className="far fa-bookmark"></i>
                </button>
                <button
                  className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-brand-600 hover:border-brand-300 transition-colors"
                  title="Share"
                >
                  <i className="fas fa-share-alt"></i>
                </button>
              </div>
            </div>

            <div className="prose prose-sm max-w-none mb-8 text-gray-600">
              {artifact.explanation && (
                <p className="mb-4">{artifact.explanation}</p>
              )}
              <p>
                {artifact.description || "No visual description available yet."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Modality
                </span>
                <span className="font-medium text-gray-900">
                  {artifact.modality || "Unknown"}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Sequence
                </span>
                <span className="font-medium text-gray-900">
                  {artifact.sequence || "Not specified"}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Scanner
                </span>
                <span className="font-medium text-gray-900">
                  {artifact.scanner || "Unknown vendor"}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Date Added
                </span>
                <span className="font-medium text-gray-900">
                  {artifact.date_added || "Not available"}
                </span>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Visible Symptoms
              </h4>
              <div className="flex flex-wrap gap-2">
                {visibleSymptoms.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
                    Community Validation
                  </h4>
                  <p className="text-xs text-gray-500">
                    {isVerified
                      ? "Verified consensus"
                      : isFlagged
                        ? "Needs reviewer attention"
                        : "Open for community review"}
                  </p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-right shadow-sm ring-1 ring-gray-100">
                  <div className="text-lg font-bold text-gray-900">
                    {reliability > 0 ? `+${reliability}` : reliability}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {consensusPercentage}% agree
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => handleVote("agree")}
                  className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    userVote === "agree"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-emerald-700"
                  }`}
                  type="button"
                >
                  <i className="fas fa-thumbs-up mr-2"></i>
                  Agree ({agreements})
                </button>
                <button
                  onClick={() => handleVote("disagree")}
                  className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    userVote === "disagree"
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-rose-200 hover:text-rose-700"
                  }`}
                  type="button"
                >
                  <i className="fas fa-thumbs-down mr-2"></i>
                  Disagree ({disagreements})
                </button>
              </div>

              {voteFeedback && (
                <p className="mt-3 text-xs font-semibold text-brand-600">
                  {voteFeedback}
                </p>
              )}
            </div>

            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Remedies & Solutions
              </h4>
              <div className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100">
                {artifact.remedies || "No specific remedies known yet."}
              </div>
            </div>

            {artifact.refs && artifact.refs.length > 0 && (
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  References
                </h4>
                <ul className="text-xs text-gray-500 list-disc pl-5 space-y-2">
                  {artifact.refs.map((ref, idx) => (
                    <li key={idx}>
                      <sup className="mr-1">{ref.id}</sup>
                      {ref.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-gray-200 flex gap-4">
              <button
                onClick={() => navigate("/compare")}
                className="flex-1 bg-white border-2 border-brand-500 text-brand-600 hover:bg-brand-50 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fas fa-not-equal"></i> Compare Artifact
              </button>
              <button className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 cursor-pointer">
                <i className="fas fa-arrow-down"></i> Download Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Detail;

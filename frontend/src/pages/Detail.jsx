import { useParams, Link, useNavigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react";
import { getCategoryStyles } from "../utils/helpers";
import {
  fetchArtifactById,
  voteArtifact,
  fetchArtifactComments,
  createArtifactComment,
  deleteComment,
} from "../services/api";
import { useAuth } from "../auth/useAuth";

const NiftiViewer = lazy(() => import("../components/NiftiViewer"));

function formatRelativeTime(dateString) {
  if (!dateString) return "just now";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "recently";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, auraUser } = useAuth();

  const [artifact, setArtifact] = useState(null);
  const [loadedArtifactId, setLoadedArtifactId] = useState(null);

  // Voting states
  const [agreements, setAgreements] = useState(0);
  const [disagreements, setDisagreements] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const [voteFeedback, setVoteFeedback] = useState(null);
  const [isVoting, setIsVoting] = useState(false);

  // Comments states
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    let active = true;

    fetchArtifactById(id).then((data) => {
      if (active) {
        setArtifact(data);
        if (data) {
          setAgreements(data.agreements ?? 0);
          setDisagreements(data.disagreements ?? 0);
          setUserVote(data.user_vote ?? null);
        }
        setLoadedArtifactId(id);
      }
    });

    setCommentsLoading(true);
    fetchArtifactComments(id)
      .then((data) => {
        if (active) {
          setComments(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error("Failed to load comments:", err);
      })
      .finally(() => {
        if (active) setCommentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const isLoading = loadedArtifactId !== id;

  if (isLoading) {
    return (
      <div className="text-center py-20 text-gray-500 animate-fade-in">
        <div className="inline-flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin"></div>
          <span className="text-sm font-medium">Loading details…</span>
        </div>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Artifact not found</h2>
        <Link to="/" className="text-brand-500 hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const { badge, placeholder } = getCategoryStyles(artifact?.category);

  // Vote summary
  const reliability = agreements - disagreements;
  const totalVotes = agreements + disagreements;
  const consensusPercentage =
    totalVotes > 0 ? Math.round((agreements / totalVotes) * 100) : 100;

  /* Validation status */
  const isVerified =
    (artifact.status === "OSIPI Verified" && reliability >= 0) ||
    reliability >= 15;
  const isFlagged = reliability < 0;
  const visibleSymptoms = artifact.symptoms?.length
    ? artifact.symptoms
    : artifact.aliases?.length
      ? artifact.aliases
      : ["General artifact"];

  const handleVote = async (voteType) => {
    if (!isAuthenticated) {
      setVoteFeedback("Please sign in to vote and contribute to community consensus.");
      setTimeout(() => setVoteFeedback(null), 3500);
      return;
    }

    if (isVoting) return;

    setIsVoting(true);
    setVoteFeedback(null);

    try {
      const summary = await voteArtifact(artifact.id, voteType);
      if (summary) {
        setAgreements(summary.agreements);
        setDisagreements(summary.disagreements);
        setUserVote(summary.user_vote);
        setVoteFeedback(
          summary.user_vote
            ? `Vote registered: ${summary.user_vote === "agree" ? "Agree" : "Disagree"}`
            : "Vote retracted."
        );
      }
    } catch (err) {
      setVoteFeedback(err.message || "Failed to update vote.");
    } finally {
      setIsVoting(false);
      setTimeout(() => setVoteFeedback(null), 3000);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    if (!isAuthenticated) {
      setCommentError("Please sign in to leave a comment.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentError("");

    try {
      const newComment = await createArtifactComment(artifact.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(err.message || "Failed to delete comment.");
    }
  };

  return (
    <div className="animate-fade-in pb-12">
      <button
        onClick={() => navigate("/")}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-900 transition-all duration-200 group cursor-pointer"
      >
        <i className="fas fa-arrow-left text-[11px] transition-transform duration-200 group-hover:-translate-x-0.5"></i>
        Back to Browse
      </button>

      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200 min-h-[calc(100vh-160px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full animate-fade-in">
          {/* Medical Viewer Panel */}
          <div className="bg-[#020612] border-b lg:border-b-0 lg:border-r border-slate-800/40 flex flex-col overflow-hidden h-[450px] lg:h-auto min-h-[450px] relative">
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-700/30 to-transparent pointer-events-none hidden lg:block"></div>
            <Suspense
              fallback={
                <div className="flex-grow h-full flex items-center justify-center bg-slate-950 text-sm font-medium text-slate-400">
                  <i className="fas fa-spinner fa-spin mr-2"></i> Loading Workstation...
                </div>
              }
            >
              <NiftiViewer artifact={artifact} placeholder={placeholder} />
            </Suspense>
          </div>

          {/* Details & Community Info Panel */}
          <div className="p-6 lg:p-8 flex flex-col lg:overflow-y-auto w-full max-h-[calc(100vh-160px)] custom-scrollbar">
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
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert("Link copied to clipboard!");
                  }}
                  className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-brand-600 hover:border-brand-300 transition-colors cursor-pointer"
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
              {artifact.description && artifact.description !== artifact.explanation && (
                <p>{artifact.description}</p>
              )}
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

            {/* Community Validation & Voting */}
            <div className="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-5 shadow-xs">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                    Community Consensus
                    {isVerified && (
                      <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium">
                        Verified
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isVerified
                      ? "High-confidence clinical consensus"
                      : isFlagged
                        ? "Needs reviewer evaluation"
                        : "Open for community feedback & validation"}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-4 py-2 text-right shadow-xs border border-gray-100">
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
                  disabled={isVoting}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
                    userVote === "agree"
                      ? "border-emerald-400 bg-emerald-500 text-white shadow-emerald-200"
                      : "border-gray-250 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700"
                  }`}
                  type="button"
                >
                  <i className="fas fa-thumbs-up"></i>
                  Agree ({agreements})
                </button>
                <button
                  onClick={() => handleVote("disagree")}
                  disabled={isVoting}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
                    userVote === "disagree"
                      ? "border-rose-400 bg-rose-500 text-white shadow-rose-200"
                      : "border-gray-250 bg-white text-gray-700 hover:border-rose-400 hover:bg-rose-50/50 hover:text-rose-700"
                  }`}
                  type="button"
                >
                  <i className="fas fa-thumbs-down"></i>
                  Disagree ({disagreements})
                </button>
              </div>

              {voteFeedback && (
                <p className="mt-3 text-xs font-semibold text-brand-600 animate-fade-in">
                  {voteFeedback}
                </p>
              )}

              {!isAuthenticated && (
                <div className="mt-3 pt-3 border-t border-gray-200/60 text-xs text-gray-500 flex items-center justify-between">
                  <span>Sign in to cast your consensus vote.</span>
                  <Link to="/auth" className="text-brand-600 font-semibold hover:underline">
                    Sign In →
                  </Link>
                </div>
              )}
            </div>

            {/* Remedies & Solutions */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Remedies & Solutions
              </h4>
              <div className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100">
                {artifact.remedies || "No specific remedies known yet."}
              </div>
            </div>

            {/* References */}
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

            {/* Community Discussions & Comments Section */}
            <div className="mb-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <i className="far fa-comments text-brand-500"></i>
                  Clinical Discussions & Notes
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                    {comments.length}
                  </span>
                </h4>
              </div>

              {/* Comment Input Form */}
              <form onSubmit={handleCommentSubmit} className="mb-6">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      isAuthenticated
                        ? "Add clinical observation, acquisition parameter note, or discussion point..."
                        : "Sign in to leave a comment or observation..."
                    }
                    disabled={!isAuthenticated || isSubmittingComment}
                    className="w-full text-sm p-3.5 bg-gray-50 border border-gray-250 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all resize-none text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    {commentError ? (
                      <span className="text-xs text-rose-600 font-medium">{commentError}</span>
                    ) : !isAuthenticated ? (
                      <span className="text-xs text-gray-400">
                        <Link to="/auth" className="text-brand-600 font-semibold hover:underline">
                          Log in
                        </Link>{" "}
                        to post a comment.
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Posting as <strong className="text-gray-700">{auraUser?.name || auraUser?.email || "Contributor"}</strong>
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={!isAuthenticated || !commentText.trim() || isSubmittingComment}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                    >
                      {isSubmittingComment ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Posting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane text-[10px]"></i>
                          Post Note
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Comments List */}
              {commentsLoading ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-2"></div>
                  Loading discussions...
                </div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                  <i className="far fa-comment-dots text-2xl text-gray-300 mb-2 block"></i>
                  <p className="text-xs text-gray-500 font-medium">No community comments yet.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Be the first to share clinical context or troubleshooting tips!</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 bg-gray-50 rounded-2xl border border-gray-150 transition-all hover:bg-gray-50/90"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200">
                            {(comment.author_name || "U")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900">
                                {comment.author_name}
                              </span>
                              {comment.author_role && comment.author_role !== "public_user" && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold uppercase tracking-wider ${
                                    comment.author_role === "admin"
                                      ? "bg-purple-100 text-purple-800"
                                      : comment.author_role === "reviewer"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {comment.author_role}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 block">
                              {formatRelativeTime(comment.created_at)}
                            </span>
                          </div>
                        </div>

                        {(comment.is_author || auraUser?.role === "admin" || auraUser?.role === "reviewer") && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-gray-300 hover:text-rose-500 text-xs p-1 transition-colors cursor-pointer"
                            title="Delete Comment"
                          >
                            <i className="far fa-trash-alt"></i>
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-gray-700 whitespace-pre-wrap pl-9 leading-relaxed">
                        {comment.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-6 border-t border-gray-200 flex gap-4">
              <button
                onClick={() => navigate("/compare")}
                className="flex-1 bg-white border-2 border-brand-500 text-brand-600 hover:bg-brand-50 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fas fa-not-equal"></i> Compare Artifact
              </button>
              <button
                onClick={() => {
                  if (artifact.primaryRepresentativeUrl) {
                    window.open(artifact.primaryRepresentativeUrl, "_blank");
                  } else {
                    alert("No download data available for this artifact.");
                  }
                }}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 cursor-pointer"
              >
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

import { supabase } from "../lib/supabase";

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

const UNKNOWN = "Unknown";

const asArray = (value) => (Array.isArray(value) ? value : []);

const firstText = (...values) =>
    values.find((value) => typeof value === "string" && value.trim())?.trim() || "";

const formatDisplayDate = (value) => {
    if (!value) {
        return "Not available";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
};

const deriveCategory = (artifact) => {
    const tags = asArray(artifact.tags);
    const searchText = [
        artifact.title,
        artifact.explanation,
        artifact.visual_description,
        artifact.default_modality,
        ...tags,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    if (searchText.includes("motion") || searchText.includes("ghost")) {
        return "Motion";
    }
    if (
        searchText.includes("b0") ||
        searchText.includes("suscept") ||
        searchText.includes("magnetic")
    ) {
        return "Magnetic Field";
    }
    if (searchText.includes("rf") || searchText.includes("hardware")) {
        return "Hardware/RF";
    }
    if (searchText.includes("flow")) {
        return "Flow";
    }

    return artifact.default_modality && artifact.default_modality !== "UNKNOWN"
        ? artifact.default_modality
        : "Artifact";
};

const formatRemedies = (remedies = []) => {
    if (!Array.isArray(remedies) || remedies.length === 0) {
        return "";
    }

    return remedies
        .map((remedy) => {
            if (typeof remedy === "string") {
                return remedy;
            }
            const stage = firstText(remedy.stage, remedy.type);
            const text = firstText(remedy.text, remedy.description, remedy.value);
            return stage ? `${stage}: ${text}`.trim() : text;
        })
        .filter(Boolean)
        .join("\n");
};

const sortFilesForDisplay = (files = []) =>
    [...files].sort((a, b) => {
        const rank = { thumbnail: 0, jpg: 1, png: 2, overlay: 3, mask: 4 };
        const aKey = a.file_role || a.file_type || "";
        const bKey = b.file_role || b.file_type || "";
        return (rank[aKey] ?? 99) - (rank[bKey] ?? 99);
    });

const isDisplayImageFile = (file) => ["jpg", "png"].includes(file.file_type);

const isNiftiFile = (file) => ["nifti", "nii_gz"].includes(file.file_type);

const niftiNameFromUrl = (url, fileType, fallbackIndex) => {
    const extension = fileType === "nii_gz" ? ".nii.gz" : ".nii";
    const fallback = `volume-${fallbackIndex + 1}${extension}`;

    try {
        const { pathname } = new URL(url);
        const basename = decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "");
        if (basename.toLowerCase().endsWith(".nii") || basename.toLowerCase().endsWith(".nii.gz")) {
            return basename;
        }
    } catch {
        const basename = String(url).split("?")[0].split("/").filter(Boolean).pop() || "";
        if (basename.toLowerCase().endsWith(".nii") || basename.toLowerCase().endsWith(".nii.gz")) {
            return basename;
        }
    }

    return fallback;
};

const flattenPublicFiles = (images = []) =>
    asArray(images).flatMap((image) =>
        sortFilesForDisplay(asArray(image.files)).map((file) => ({
            ...file,
            image_id: image.id,
            image_title: image.title,
            image_caption: image.caption,
            image_relationship_type: image.relationship_type,
        }))
    );

const primaryImage = (images = []) =>
    asArray(images).find((image) => image.relationship_type === "primary") ||
    asArray(images)[0] ||
    null;

const statusLabel = (status) => {
    if (status === "osipi_verified" || status === "approved") {
        return "OSIPI Verified";
    }
    if (status === "contributor_published" || status === "community_published") {
        return "Contributor Published";
    }
    if (status === "flagged") {
        return "Flagged";
    }
    if (status === "rejected") {
        return "Rejected";
    }
    if (status === "archived") {
        return "Archived";
    }
    return "Contributor Submitted";
};

const reliabilityVotesFromScore = (score = 0) => ({
    agreements: score > 0 ? score : 0,
    disagreements: score < 0 ? Math.abs(score) : 0,
});

const isPresent = (value) => value !== undefined && value !== null && value !== "";

const parseApiError = async (response) => {
    try {
        const payload = await response.json();

        if (typeof payload.detail === "string") {
            return payload.detail;
        }

        if (Array.isArray(payload.detail)) {
            return payload.detail
                .map((item) => item.msg || item.message)
                .filter(Boolean)
                .join(" ");
        }

        if (typeof payload.message === "string") {
            return payload.message;
        }
    } catch {
        // Fall through to the generic status message below.
    }

    return `AURA API request failed: ${response.status} ${response.statusText}`;
};

const getAccessToken = async () => {
    if (!supabase) {
        return null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Failed to read Supabase session.", error);
        return null;
    }

    return data.session?.access_token ?? null;
};

// Backend fields are canonical. The extra display aliases below keep the
// current prototype components working while the UI is gradually migrated.
const mapArtifact = (artifact) => {
    const aliases = asArray(artifact.aliases).filter(Boolean);
    const tags = asArray(artifact.tags).filter(Boolean);
    const images = asArray(artifact.images);
    const image = primaryImage(images);
    const publicFiles = flattenPublicFiles(images);
    const title = firstText(artifact.title, "Untitled artifact");
    const visualDescription = firstText(artifact.visual_description);
    const explanation = firstText(artifact.explanation);
    const defaultModality = firstText(artifact.default_modality, image?.modality, UNKNOWN);

    const isMontageRole = (role) => ["axial_montage", "coronal_montage", "sagittal_montage"].includes(role);

    const axialMontageFile = publicFiles.find((f) => f.file_role === "axial_montage");
    const coronalMontageFile = publicFiles.find((f) => f.file_role === "coronal_montage");
    const sagittalMontageFile = publicFiles.find((f) => f.file_role === "sagittal_montage");

    const montages = {
        axial: axialMontageFile?.public_url || null,
        coronal: coronalMontageFile?.public_url || null,
        sagittal: sagittalMontageFile?.public_url || null,
    };

    const representativeFiles = publicFiles.filter(
        (f) => isDisplayImageFile(f) && !isMontageRole(f.file_role)
    );

    const primaryRepFile = representativeFiles.find((f) => f.file_role === "primary_representative") || representativeFiles[0];

    const examples = representativeFiles
        .map((file) => file.public_url)
        .filter(Boolean);

    const niftiVolumes = publicFiles
        .filter(isNiftiFile)
        .filter((file) => file.public_url)
        .map((file, index) => ({
            id: file.id,
            name: firstText(file.image_title, title, `Volume ${index + 1}`),
            niivueName: niftiNameFromUrl(file.public_url, file.file_type, index),
            url: file.public_url,
            file_type: file.file_type,
            relationship_type: file.image_relationship_type,
        }));

    const reliabilityScore = Number(artifact.reliability_score ?? image?.reliability_score ?? 0);
    const fallbackVotes = reliabilityVotesFromScore(reliabilityScore);
    const agreements = Number(artifact.agreements ?? fallbackVotes.agreements);
    const disagreements = Number(artifact.disagreements ?? fallbackVotes.disagreements);
    const dateAddedRaw = artifact.created_at || artifact.updated_at || null;

    let sliceMetadata = [];
    try {
        const rawNotes = artifact.submission?.submitter_notes || artifact.submitter_notes || artifact.raw?.submitter_notes;
        if (typeof rawNotes === "string") {
            sliceMetadata = JSON.parse(rawNotes).slice_metadata || [];
        } else if (typeof rawNotes === "object" && rawNotes !== null) {
            sliceMetadata = rawNotes.slice_metadata || [];
        }
    } catch {
        sliceMetadata = [];
    }

    const exampleSlices = representativeFiles.map((file, index) => {
        const url = file.public_url;
        const urlFilename = String(url.split("/").pop() || "").split("?")[0].toLowerCase();

        const meta = sliceMetadata.find((s) => {
            if (!s || !s.filename) return false;
            const metaName = String(s.filename).toLowerCase();
            return urlFilename.endsWith(metaName) || metaName.endsWith(urlFilename) || urlFilename.includes(metaName);
        }) || sliceMetadata[index];

        const isKeySlice = file.file_role === "primary_representative" || Boolean(meta?.is_priority || meta?.is_key_slice);

        return {
            url,
            index: index + 1,
            filename: meta?.filename || urlFilename,
            view: meta?.view || "axial",
            isKeySlice,
            isPrimary: file.file_role === "primary_representative",
        };
    });

    return {
        id: String(artifact.id),

        title,
        aliases,
        explanation,
        visual_description: visualDescription,
        remedies_raw: asArray(artifact.remedies),
        default_modality: defaultModality,
        backendStatus: artifact.status || "unknown",
        tags,
        images,
        publicFiles,
        niftiVolumes,
        sliceMetadata,
        exampleSlices,
        montages,
        primaryRepresentativeUrl: primaryRepFile?.public_url || examples[0] || null,
        created_at: artifact.created_at,
        updated_at: artifact.updated_at,

        name: title,
        full_name: title,
        category: deriveCategory(artifact),
        alt_names: aliases.join(", "),
        description: visualDescription,
        remedies: formatRemedies(artifact.remedies),
        symptoms: tags,
        refs: [],
        examples,
        thumbnail_url: examples[0] || null,
        modality: defaultModality,
        scanner: firstText(image?.vendor, "Unknown vendor"),
        vendor: image?.vendor || null,
        sequence: firstText(image?.sequence, "Not specified"),
        protocol: image?.protocol || null,
        field_strength: image?.field_strength || null,
        date_added: formatDisplayDate(dateAddedRaw),
        date_added_raw: dateAddedRaw,
        status: statusLabel(artifact.status),
        reliability_score: reliabilityScore,
        agreements,
        disagreements,
        user_vote: artifact.user_vote || null,
        raw: artifact,
    };
};

const requestJson = async (path, options = {}) => {
    const accessToken = await getAccessToken();
    const isFormData = options.body instanceof FormData;
    const headers = {
        Accept: "application/json",
        ...(!isFormData && options.body ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers || {}),
    };

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });
    } catch {
        throw new Error(
            "Cannot connect to the AURA API backend server (http://127.0.0.1:8000). Ensure the FastAPI backend server is running."
        );
    }

    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(await parseApiError(response));
    }

    if (response.status === 204) {
        return true;
    }

    return response.json();
};

const buildQueryString = (params = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (isPresent(value)) {
            searchParams.set(key, value);
        }
    });

    const query = searchParams.toString();
    return query ? `?${query}` : "";
};

export const fetchArtifacts = async (params = {}) => {
    const artifacts = await requestJson(`/artifacts${buildQueryString(params)}`);
    return asArray(artifacts).map(mapArtifact);
};

export const fetchArtifactById = async (id) => {
    const artifact = await requestJson(`/artifacts/${encodeURIComponent(id)}`);
    return artifact ? mapArtifact(artifact) : null;
};

export const fetchArtifactVoteSummary = async (artifactId) =>
    requestJson(`/artifacts/${encodeURIComponent(artifactId)}/vote-summary`);

export const voteArtifact = async (artifactId, voteType) =>
    requestJson(`/artifacts/${encodeURIComponent(artifactId)}/vote`, {
        method: "POST",
        body: JSON.stringify({ vote_type: voteType }),
    });

export const fetchArtifactComments = async (artifactId) => {
    const comments = await requestJson(`/artifacts/${encodeURIComponent(artifactId)}/comments`);
    return asArray(comments);
};

export const createArtifactComment = async (artifactId, text) =>
    requestJson(`/artifacts/${encodeURIComponent(artifactId)}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
    });

export const deleteComment = async (commentId) =>
    requestJson(`/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
    });

export const fetchCurrentUser = async () => requestJson("/auth/me");

export const fetchMySubmissions = async () => requestJson("/submissions/me");

export const updateMySubmission = async (submissionId, payload) =>
    requestJson(`/submissions/${encodeURIComponent(submissionId)}/edit`, {
        method: "POST",
        body: JSON.stringify({
            artifact_name: payload.artifactName,
            modality: payload.modality,
            category: payload.category,
            description: payload.description,
            scanner: payload.scanner,
            sequence: payload.sequence,
            protocol: payload.protocol,
            field_strength: payload.fieldStrength,
            symptoms: payload.symptoms || [],
            remedies: payload.remedies,
        }),
    });

export const withdrawMySubmission = async (submissionId) =>
    requestJson(`/submissions/${encodeURIComponent(submissionId)}`, {
        method: "DELETE",
    });

export const republishMySubmission = async (submissionId) =>
    requestJson(`/submissions/${encodeURIComponent(submissionId)}/republish`, {
        method: "POST",
    });

export const moderateArtifact = async (artifactId, action, reviewNote = "") => {
    const paths = {
        archive: `/admin/artifacts/${encodeURIComponent(artifactId)}/archive`,
        flag: `/review/artifacts/${encodeURIComponent(artifactId)}/flag`,
        reject: `/review/artifacts/${encodeURIComponent(artifactId)}/reject`,
        verify: `/review/artifacts/${encodeURIComponent(artifactId)}/verify`,
    };
    const path = paths[action];

    if (!path) {
        throw new Error(`Unknown moderation action: ${action}`);
    }

    return requestJson(path, {
        method: "POST",
        body: JSON.stringify({
            review_note: reviewNote.trim() || null,
        }),
    });
};

export const createSubmission = async ({
    artifactName,
    contactEmail,
    modality,
    category,
    scanner,
    sequence,
    protocol,
    fieldStrength,
    symptoms,
    description,
    remedies,
    references,
    submitterNotes,
    permissionConfirmed = true,
    pseudonymisationConfirmed = true,
    saveAsDraft = false,
    files = [],
    primaryIndex = 0,
    axialMontageFile = null,
    coronalMontageFile = null,
    sagittalMontageFile = null,
    sliceMetadata,
}) => {
    const formData = new FormData();
    const fields = {
        artifact_name: artifactName,
        contact_email: contactEmail,
        modality,
        category,
        scanner,
        sequence,
        protocol,
        field_strength: fieldStrength,
        symptoms: JSON.stringify(symptoms || []),
        description,
        remedies,
        references,
        submitter_notes: submitterNotes,
        slice_metadata: sliceMetadata ? JSON.stringify(sliceMetadata) : null,
        permission_confirmed: permissionConfirmed ? "true" : "false",
        pseudonymisation_confirmed: pseudonymisationConfirmed ? "true" : "false",
        save_as_draft: saveAsDraft ? "true" : "false",
        primary_index: String(primaryIndex),
    };

    Object.entries(fields).forEach(([key, value]) => {
        if (isPresent(value)) {
            formData.append(key, value);
        }
    });

    files.forEach((file) => {
        formData.append("files", file);
    });

    if (axialMontageFile) {
        formData.append("axial_montage", axialMontageFile);
    }
    if (coronalMontageFile) {
        formData.append("coronal_montage", coronalMontageFile);
    }
    if (sagittalMontageFile) {
        formData.append("sagittal_montage", sagittalMontageFile);
    }

    return requestJson("/submissions", {
        method: "POST",
        body: formData,
    });
};

export const fetchMetadataSchema = async (modality) =>
    requestJson(`/metadata-schema${buildQueryString(modality ? { modality } : {})}`);

export const createMetadataField = async (payload) =>
    requestJson("/metadata-schema", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateMetadataField = async (fieldId, payload) =>
    requestJson(`/metadata-schema/${encodeURIComponent(fieldId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const deleteMetadataField = async (fieldId) =>
    requestJson(`/metadata-schema/${encodeURIComponent(fieldId)}`, {
        method: "DELETE",
    });

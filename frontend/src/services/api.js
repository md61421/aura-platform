import { supabase } from "../lib/supabase";

const getFallbackApiBaseUrl = () => {
    if (typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app")) {
        return "https://aura-platform-chi.vercel.app/api/v1";
    }
    const defaultHost =
        typeof window !== "undefined" && window.location.hostname === "localhost"
            ? "localhost"
            : "127.0.0.1";
    return `http://${defaultHost}:8000/api/v1`;
};

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || getFallbackApiBaseUrl()
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
    if (status === "contributor_published") {
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
    const examples = publicFiles
        .filter(isDisplayImageFile)
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
    const reliabilityScore = Number(image?.reliability_score || 0);
    const votes = reliabilityVotesFromScore(reliabilityScore);
    const dateAddedRaw = artifact.created_at || artifact.updated_at || null;

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
        modality_metadata:
            artifact.modality_metadata && Object.keys(artifact.modality_metadata).length > 0
                ? artifact.modality_metadata
                : asArray(artifact.remedies).find((r) => r && r.stage === "modality_metadata")?.data ||
                  (defaultModality === "ASL"
                      ? {
                            labeling_time: "1800 ms",
                            pld: "2000 ms",
                            readout: "3D GRASE",
                            labeling_strategy: "PCASL",
                        }
                      : defaultModality === "DSC"
                      ? {
                            te: "30 ms",
                            tr: "1500 ms",
                            flip_angle: "60 deg",
                            contrast_agent: "Gadolinium-based",
                        }
                      : {}),
        scanner: firstText(image?.vendor, "Unknown vendor"),
        vendor: image?.vendor || null,
        sequence: firstText(image?.sequence, "Not specified"),
        protocol: image?.protocol || null,
        field_strength: image?.field_strength || null,
        date_added: formatDisplayDate(dateAddedRaw),
        date_added_raw: dateAddedRaw,
        status: statusLabel(artifact.status),
        reliability_score: reliabilityScore,
        agreements: votes.agreements,
        disagreements: votes.disagreements,
        raw: artifact,
    };
};

const requestJson = async (path, options = {}) => {
    const accessToken = await getAccessToken();
    const isFormData = options.body instanceof FormData;
    const isJsonBody = !isFormData && options.body !== undefined && options.body !== null;
    const isObjectBody = isJsonBody && typeof options.body === "object";

    const headers = {
        Accept: "application/json",
        ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers || {}),
    };

    const fetchOptions = {
        ...options,
        headers,
        ...(isObjectBody ? { body: JSON.stringify(options.body) } : {}),
    };

    const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);

    if (response.status === 404 || response.status === 204) {
        return null;
    }
    if (!response.ok) {
        throw new Error(await parseApiError(response));
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
    permissionConfirmed,
    pseudonymisationConfirmed,
    saveAsDraft = false,
    files = [],
    modalityMetadata,
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
        modality_metadata: JSON.stringify(modalityMetadata || {}),
        permission_confirmed: permissionConfirmed ? "true" : "false",
        pseudonymisation_confirmed: pseudonymisationConfirmed ? "true" : "false",
        save_as_draft: saveAsDraft ? "true" : "false",
    };

    Object.entries(fields).forEach(([key, value]) => {
        if (isPresent(value)) {
            formData.append(key, value);
        }
    });

    asArray(files).forEach((file) => {
        if (file instanceof File || file instanceof Blob) {
            formData.append("files", file, file.name || "upload");
        }
    });

    return requestJson("/submissions", {
        method: "POST",
        body: formData,
    });
};

export const fetchMetadataSchema = async (modality) => {
    const query = modality ? `?modality=${encodeURIComponent(modality)}` : "";
    return requestJson(`/metadata-schema${query}`);
};

export const createMetadataField = async (fieldPayload) => {
    return requestJson("/metadata-schema", {
        method: "POST",
        body: fieldPayload,
    });
};

export const updateMetadataField = async (fieldId, fieldPayload) => {
    return requestJson(`/metadata-schema/${fieldId}`, {
        method: "PUT",
        body: fieldPayload,
    });
};

export const deleteMetadataField = async (fieldId) => {
    return requestJson(`/metadata-schema/${fieldId}`, {
        method: "DELETE",
    });
};


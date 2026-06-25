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
    if (status === "community_published") {
        return "Community Published";
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
    return "Community Submitted";
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
    const reliabilityScore = image?.reliability_score || 0;
    const votes = reliabilityVotesFromScore(reliabilityScore);

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
        scanner: firstText(image?.vendor, "Unknown vendor"),
        vendor: image?.vendor || null,
        sequence: firstText(image?.sequence, "Not specified"),
        protocol: image?.protocol || null,
        field_strength: image?.field_strength || null,
        date_added: formatDisplayDate(artifact.created_at || artifact.updated_at),
        status: statusLabel(artifact.status),
        reliability_score: reliabilityScore,
        agreements: votes.agreements,
        disagreements: votes.disagreements,
        raw: artifact,
    };
};

const requestJson = async (path, options = {}) => {
    const accessToken = await getAccessToken();
    const headers = {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(await parseApiError(response));
    }

    return response.json();
};

export const fetchArtifacts = async () => {
    const artifacts = await requestJson("/artifacts");
    return asArray(artifacts).map(mapArtifact);
};

export const fetchArtifactById = async (id) => {
    const artifact = await requestJson(`/artifacts/${encodeURIComponent(id)}`);
    return artifact ? mapArtifact(artifact) : null;
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
    files,
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
        permission_confirmed: permissionConfirmed ? "true" : "false",
        pseudonymisation_confirmed: pseudonymisationConfirmed ? "true" : "false",
    };

    Object.entries(fields).forEach(([key, value]) => {
        if (isPresent(value)) {
            formData.append(key, value);
        }
    });

    files.forEach((file) => {
        formData.append("files", file);
    });

    return requestJson("/submissions", {
        method: "POST",
        body: formData,
    });
};

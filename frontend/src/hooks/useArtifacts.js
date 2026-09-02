import { useState, useEffect, useMemo } from 'react';
import { fetchArtifacts } from '../services/api';

const timestampForSort = (value) => {
    const timestamp = new Date(value || "").getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
};

const defaultFilters = {
    modalities: [],
    sequences: [],
    scanner: "",
};

const uniqueSorted = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

const buildArtifactSearchText = (artifact) => {
    const parts = [
        artifact.name,
        artifact.title,
        artifact.full_name,
        artifact.alt_names,
        Array.isArray(artifact.aliases) ? artifact.aliases.join(" ") : "",
        artifact.description,
        artifact.visual_description,
        artifact.explanation,
        artifact.category,
        artifact.modality,
        artifact.default_modality,
        artifact.scanner,
        artifact.vendor,
        artifact.field_strength,
        artifact.sequence,
        artifact.protocol,
        artifact.status,
        artifact.backendStatus,
        artifact.submitted_by,
        artifact.submitter_notes,
        artifact.remedies,
        Array.isArray(artifact.symptoms) ? artifact.symptoms.join(" ") : "",
        Array.isArray(artifact.tags) ? artifact.tags.join(" ") : "",
    ];

    // Modality metadata key-values (e.g. "PLD 1800", "labeling_duration 1500")
    if (artifact.modality_metadata && typeof artifact.modality_metadata === "object") {
        Object.entries(artifact.modality_metadata).forEach(([k, v]) => {
            parts.push(k.replace(/_/g, " "));
            if (v !== null && v !== undefined) {
                parts.push(String(v));
            }
        });
    }

    // Remedies raw structured entries
    if (Array.isArray(artifact.remedies_raw)) {
        artifact.remedies_raw.forEach((rem) => {
            if (typeof rem === "string") parts.push(rem);
            else if (rem && typeof rem === "object") {
                if (rem.stage) parts.push(rem.stage);
                if (rem.type) parts.push(rem.type);
                if (rem.text) parts.push(rem.text);
                if (rem.description) parts.push(rem.description);
                if (rem.value) parts.push(rem.value);
            }
        });
    }

    // Images and slice metadata details
    if (Array.isArray(artifact.images)) {
        artifact.images.forEach((img) => {
            if (img.title) parts.push(img.title);
            if (img.caption) parts.push(img.caption);
            if (img.vendor) parts.push(img.vendor);
            if (img.sequence) parts.push(img.sequence);
            if (img.protocol) parts.push(img.protocol);
            if (img.field_strength) parts.push(img.field_strength);
            if (img.modality_metadata && typeof img.modality_metadata === "object") {
                Object.entries(img.modality_metadata).forEach(([k, v]) => {
                    parts.push(k.replace(/_/g, " "));
                    if (v !== null && v !== undefined) parts.push(String(v));
                });
            }
        });
    }

    if (Array.isArray(artifact.sliceMetadata)) {
        artifact.sliceMetadata.forEach((s) => {
            if (s.view) parts.push(s.view);
            if (s.filename) parts.push(s.filename);
        });
    }

    return parts.filter(Boolean).join(" ").toLowerCase();
};

/**
 * Custom hook to manage fetching and filtering artifacts.
 */
export function useArtifacts() {
    const [artifacts, setArtifacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filter and Sort states
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("reliability");
    const [filters, setFilters] = useState(defaultFilters);

    useEffect(() => {
        let isMounted = true;
        
        async function loadData() {
            setIsLoading(true);
            try {
                const data = await fetchArtifacts();
                if (isMounted) {
                    setArtifacts(data);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) setError(err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredArtifacts = useMemo(() => {
        const searchTokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

        const filtered = artifacts.filter((artifact) => {
            let matchesQuery = true;
            if (searchTokens.length > 0) {
                const searchableText = buildArtifactSearchText(artifact);
                matchesQuery = searchTokens.every((token) => searchableText.includes(token));
            }

            const matchesModality = filters.modalities.length === 0 || filters.modalities.includes(artifact.modality);
            const artifactSequences = [
                artifact.sequence,
                ...(Array.isArray(artifact.images) ? artifact.images.map((img) => img.sequence) : [])
            ].filter((seq) => seq && seq !== "Not specified");
            const matchesSequence = !filters.sequences || filters.sequences.length === 0 ||
                filters.sequences.some((filterSeq) =>
                    artifactSequences.some((artSeq) => artSeq.toLowerCase() === filterSeq.toLowerCase())
                );
            const matchesScanner = !filters.scanner || artifact.scanner === filters.scanner;

            return matchesQuery && matchesModality && matchesSequence && matchesScanner;
        });

        // Then apply sorting
        return [...filtered].sort((a, b) => {
            if (sortBy === "reliability") {
                const scoreA = Number(a.reliability_score || 0);
                const scoreB = Number(b.reliability_score || 0);
                return scoreB - scoreA; // Descending
            } else if (sortBy === "name") {
                return (a.name || "").localeCompare(b.name || ""); // Ascending
            } else if (sortBy === "date") {
                const dateA = timestampForSort(a.date_added_raw);
                const dateB = timestampForSort(b.date_added_raw);
                return dateB - dateA;
            } else if (sortBy === "date_oldest") {
                const dateA = timestampForSort(a.date_added_raw);
                const dateB = timestampForSort(b.date_added_raw);
                return dateA - dateB;
            }
            return 0;
        });
    }, [artifacts, filters, query, sortBy]);

    const filterOptions = useMemo(() => {
        const sequences = [];
        artifacts.forEach((artifact) => {
            if (artifact.sequence && typeof artifact.sequence === "string" && artifact.sequence.trim() && artifact.sequence !== "Not specified") {
                sequences.push(artifact.sequence.trim());
            }
            if (Array.isArray(artifact.images)) {
                artifact.images.forEach((img) => {
                    if (img.sequence && typeof img.sequence === "string" && img.sequence.trim() && img.sequence !== "Not specified") {
                        sequences.push(img.sequence.trim());
                    }
                });
            }
        });

        return {
            modalities: uniqueSorted(artifacts.map((artifact) => artifact.modality)),
            sequences: uniqueSorted(sequences),
            scanners: uniqueSorted(artifacts.map((artifact) => artifact.scanner)),
        };
    }, [artifacts]);

    const setFilter = (key, value) => {
        setFilters((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const toggleFilter = (key, value) => {
        setFilters((current) => {
            const values = current[key];
            const nextValues = values.includes(value)
                ? values.filter((currentValue) => currentValue !== value)
                : [...values, value];

            return {
                ...current,
                [key]: nextValues,
            };
        });
    };

    const resetFilters = () => {
        setFilters(defaultFilters);
    };

    const clearFilters = () => {
        setQuery("");
        setSortBy("reliability");
        resetFilters();
    }

    return {
        artifacts,
        filteredArtifacts,
        isLoading,
        error,
        query,
        setQuery,
        sortBy,
        setSortBy,
        filters,
        setFilter,
        toggleFilter,
        resetFilters,
        filterOptions,
        clearFilters
    };
}

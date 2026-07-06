import { useState, useEffect, useMemo } from 'react';
import { fetchArtifacts } from '../services/api';

const timestampForSort = (value) => {
    const timestamp = new Date(value || "").getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
};

const defaultFilters = {
    modalities: [],
    categories: [],
    scanner: "",
};

const uniqueSorted = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

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
        const filtered = artifacts.filter((artifact) => {
            const searchStr = query.toLowerCase();
            const matchesQuery = (
                (artifact.name && artifact.name.toLowerCase().includes(searchStr)) ||
                (artifact.description && artifact.description.toLowerCase().includes(searchStr)) ||
                (artifact.explanation && artifact.explanation.toLowerCase().includes(searchStr)) ||
                (artifact.alt_names && artifact.alt_names.toLowerCase().includes(searchStr)) ||
                (artifact.symptoms && artifact.symptoms.some((s) => s.toLowerCase().includes(searchStr)))
            );
            const matchesModality = filters.modalities.length === 0 || filters.modalities.includes(artifact.modality);
            const matchesCategory = filters.categories.length === 0 || filters.categories.includes(artifact.category);
            const matchesScanner = !filters.scanner || artifact.scanner === filters.scanner;

            return matchesQuery && matchesModality && matchesCategory && matchesScanner;
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

    const filterOptions = useMemo(() => ({
        modalities: uniqueSorted(artifacts.map((artifact) => artifact.modality)),
        categories: uniqueSorted(artifacts.map((artifact) => artifact.category)),
        scanners: uniqueSorted(artifacts.map((artifact) => artifact.scanner)),
    }), [artifacts]);

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

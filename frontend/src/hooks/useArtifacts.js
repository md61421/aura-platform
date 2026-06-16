import { useState, useEffect, useMemo } from 'react';
import { fetchArtifacts } from '../services/api';

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
        // First filter by query
        const filtered = artifacts.filter((artifact) => {
            const searchStr = query.toLowerCase();
            return (
                artifact.name.toLowerCase().includes(searchStr) ||
                (artifact.description && artifact.description.toLowerCase().includes(searchStr)) ||
                (artifact.explanation && artifact.explanation.toLowerCase().includes(searchStr)) ||
                (artifact.alt_names && artifact.alt_names.toLowerCase().includes(searchStr)) ||
                (artifact.symptoms && artifact.symptoms.some((s) => s.toLowerCase().includes(searchStr)))
            );
        });

        // Then apply sorting
        return [...filtered].sort((a, b) => {
            if (sortBy === "reliability") {
                const scoreA = (a.agreements || 0) - (a.disagreements || 0);
                const scoreB = (b.agreements || 0) - (b.disagreements || 0);
                return scoreB - scoreA; // Descending
            } else if (sortBy === "name") {
                return a.name.localeCompare(b.name); // Ascending
            } else if (sortBy === "date") {
                const dateA = new Date(a.date_added).getTime();
                const dateB = new Date(b.date_added).getTime();
                if (isNaN(dateA) || isNaN(dateB)) {
                    return String(b.id).localeCompare(String(a.id));
                }
                return dateB - dateA;
            }
            return 0;
        });
    }, [artifacts, query, sortBy]);

    const clearFilters = () => {
        setQuery("");
        setSortBy("reliability");
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
        clearFilters
    };
}

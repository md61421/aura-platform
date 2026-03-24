import { useState, useEffect, useMemo } from 'react';
import { fetchArtifacts } from '../services/api';

/**
 * Custom hook to manage fetching and filtering artifacts.
 */
export function useArtifacts() {
    const [artifacts, setArtifacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filter states
    const [query, setQuery] = useState("");

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
        return artifacts.filter((artifact) => {
            const searchStr = query.toLowerCase();
            return (
                artifact.name.toLowerCase().includes(searchStr) ||
                (artifact.description && artifact.description.toLowerCase().includes(searchStr)) ||
                (artifact.explanation && artifact.explanation.toLowerCase().includes(searchStr)) ||
                (artifact.alt_names && artifact.alt_names.toLowerCase().includes(searchStr)) ||
                (artifact.symptoms && artifact.symptoms.some((s) => s.toLowerCase().includes(searchStr)))
            );
        });
    }, [artifacts, query]);

    const clearFilters = () => {
        setQuery("");
    }

    return {
        artifacts,
        filteredArtifacts,
        isLoading,
        error,
        query,
        setQuery,
        clearFilters
    };
}

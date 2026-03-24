import data from "../data/artifacts.json";

/**
 * Simulates an API call to fetch all artifacts.
 * In the future, this can be swapped with real fetch/axios calls.
 */
export const fetchArtifacts = async () => {
    // Simulate network delay
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(data);
        }, 300);
    });
};

/**
 * Simulates fetching a single artifact by its ID.
 * @param {number|string} id 
 */
export const fetchArtifactById = async (id) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const artifact = data.find((a) => a.id === parseInt(id));
            resolve(artifact || null);
        }, 200);
    });
};

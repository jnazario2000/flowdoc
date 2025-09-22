import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./DisplayProject.css";

function DisplayProject() {
    const location = useLocation();
    const { githubUrl } = location.state || {};
    const [files, setFiles] = useState([]);
    const [expanded, setExpanded] = useState({}); // track expanded folders
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Parse the GitHub URL
    const parseGithubUrl = (url) => {
        try {
            const parts = new URL(url).pathname.split("/").filter(Boolean);
            if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
        } catch (err) {
            console.error("Invalid GitHub URL:", url);
        }
        return null;
    };

    const parsed = parseGithubUrl(githubUrl);

    // Fetch files/folders
    const fetchFiles = async (path = "") => {
        if (!parsed) {
            setError("Could not parse GitHub URL");
            return [];
        }
        setLoading(true);
        setError(null);

        try {
            const { owner, repo } = parsed;
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
            );
            return response.data;
        } catch (err) {
            setError(err.message || "Failed to fetch files");
            return [];
        } finally {
            setLoading(false);
        }
    };

    // Load root files
    useEffect(() => {
        if (githubUrl) {
            fetchFiles("").then((data) => setFiles(data));
        }
    }, [githubUrl]);

    const toggleFolder = async (folder) => {
        if (expanded[folder.path]) {
            // Collapse
            setExpanded((prev) => {
                const newState = { ...prev };
                delete newState[folder.path];
                return newState;
            });
        } else {
            // Expand and fetch contents
            const children = await fetchFiles(folder.path);
            setExpanded((prev) => ({ ...prev, [folder.path]: children }));
        }
    };

    const handleFileClick = (file) => {
        if (file.type === "file") {
            navigate(`/documentpage/${parsed.owner}/${parsed.repo}/${file.path}`);
        }
    };

    const renderFiles = (items) => {
        const nonFolders = items.filter((f) => f.type === "file");
        const folders = items.filter((f) => f.type === "dir");

        return (
            <ul>
                {/* First show non-folders */}
                {nonFolders.map((file) => (
                    <li key={file.sha}>
                        <button onClick={() => handleFileClick(file)}>
                            📄 {file.name}
                        </button>
                    </li>
                ))}

                {/* Then show folders */}
                {folders.map((folder) => (
                    <li key={folder.sha}>
                        <button onClick={() => toggleFolder(folder)}>
                            {expanded[folder.path] ? "▾" : "➤"} 📁 {folder.name}
                        </button>
                        {expanded[folder.path] && renderFiles(expanded[folder.path])}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="testproject-container">
            <div className="testproject-header">
                <h1>Test Project</h1>
                <p>
                    <strong>Repo:</strong>{" "}
                    {parsed ? `${parsed.owner}/${parsed.repo}` : "Invalid URL"}
                </p>
            </div>

            {loading && <p>Loading files...</p>}
            {error && <p >Error: {error}</p>}

            <div className="testproject-files">{renderFiles(files)}</div>
        </div>
    );
}

export default DisplayProject;

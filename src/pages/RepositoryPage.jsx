// src/pages/RepositoryPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import "./RepositoryPage.css";

export default function RepositoryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    // Try to get repoKey from multiple sources
    const { repoInfo, repoKey: stateRepoKey, projectId, token } = location.state || {};
    const repoKey = stateRepoKey || params.repoKey;

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- helpers ---
    const stripGitHubBlob = (p) => p || "";

    const since = (dateString) => {
        if (!dateString) return "Just now";
        const d = new Date(dateString);
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        return days <= 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} ago`;
    };

    // --- fetch files recursively from GitHub ---
    const fetchFiles = async (owner, repo, path = "") => {
        try {
            const headers = token ? { Authorization: `token ${token}` } : {};
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers });
            if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
            const data = await res.json();

            let allFiles = [];
            for (const item of data) {
                if (item.type === "dir") {
                    const subFiles = await fetchFiles(owner, repo, item.path);
                    allFiles.push(...subFiles);
                } else {
                    allFiles.push({
                        name: item.name,
                        path: item.path,
                        download_url: item.download_url,
                        size: item.size,
                        lastEdited: item?.git_url || null,
                    });
                }
            }
            return allFiles;
        } catch (err) {
            console.error(err);
            setError(err.message);
            return [];
        }
    };

    useEffect(() => {
        const loadFiles = async () => {
            setLoading(true);
            if (!repoKey) {
                setError("No repo key provided");
                setLoading(false);
                return;
            }

            const [owner, repo] = repoKey.split("/");
            const fetchedFiles = await fetchFiles(owner, repo);
            setFiles(fetchedFiles);
            setLoading(false);
        };

        loadFiles();
    }, [repoKey, token]);

    const normalizedFiles = useMemo(() => {
        return files.slice(0, 10).map(f => ({
            path: stripGitHubBlob(f.path),
            name: f.name,
            size: f.size ?? "-",
            lastEdited: f.lastEdited,
        }));
    }, [files]);

    const openEditor = (filePath) => {
        if (!repoKey) {
            console.error("Cannot open editor: repoKey is missing");
            alert("Repository information is missing. Please go back and select the repository again.");
            return;
        }

        console.log("Opening editor with:", { repoKey, filePath }); // Debug log

        const params = new URLSearchParams({
            repoKey: repoKey,
            path: filePath,
            branch: 'main'
        });

        const editorUrl = `/editor?${params.toString()}`;
        console.log("Navigating to:", editorUrl); // Debug log
        navigate(editorUrl);
    };

    // --- UI ---
    return (
        <div className="project-container">
            <header className="project-header">
                <div className="header-top">
                    <Link to="/" className="back-button">← Back to Home</Link>
                </div>
                <div className="header-content">
                    <h1 className="project-title">{repoInfo?.name || repoKey}</h1>
                    {repoInfo?.description && <p>{repoInfo.description}</p>}
                    {repoInfo?.githubUrl && (
                        <a href={repoInfo.githubUrl} target="_blank" rel="noreferrer">{repoInfo.githubUrl}</a>
                    )}
                    {repoKey && <p style={{ fontSize: '0.9em', color: '#666' }}>Repository: {repoKey}</p>}
                </div>
            </header>

            <div className="project-content">
                <section className="files-section">
                    <h2>Files</h2>
                    {loading && <p>Loading files...</p>}
                    {error && <p style={{ color: "red" }}>Error: {error}</p>}
                    {!loading && !files.length && !error && <div>No files found.</div>}
                    {!loading && files.length > 0 && (
                        <div className="files-table-container">
                            <table className="files-table">
                                <thead>
                                <tr>
                                    <th>File</th>
                                    <th>Size</th>
                                    <th>Last Edited</th>
                                    <th></th>
                                </tr>
                                </thead>
                                <tbody>
                                {normalizedFiles.map(file => (
                                    <tr key={file.path}>
                                        <td>{file.path}</td>
                                        <td>{file.size}</td>
                                        <td>{since(file.lastEdited)}</td>
                                        <td>
                                            <button className="edit-button" onClick={() => openEditor(file.path)}>Edit</button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
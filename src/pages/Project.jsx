import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Project.css';
import axios from 'axios';


function GitHubFileExplorer() {
    const [repoUrl, setRepoUrl] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    // goes into github and gets repo info and files
    const fetchRepoData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const urlParts = repoUrl.split('/');
            const owner = urlParts[3];
            const repo = urlParts[4];

            const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
            if (!repoResponse.ok) throw new Error("Failed to fetch repository info.");
            const repoData = await repoResponse.json();

            const files = await fetchFiles(owner, repo);
            await axios.post('http://localhost:3000/api/project-pages', {
                title: repoData.name,
                description: repoData.description,
                files: files,
            });

            navigate('/repository', {
                state: {
                    repoInfo: {
                        name: repoData.name,
                        description: repoData.description,
                    },
                    files: files
                }
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    // fetches the files and adds the data
    const fetchFiles = async (owner, repo, urlPath = '') => {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${urlPath}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        const fetchedFiles = [];

        for (const item of data) {
            if (item.type === 'dir') {
                const subFiles = await fetchFiles(owner, repo, item.path);
                fetchedFiles.push(...subFiles);
            } else {
                fetchedFiles.push({
                    name: item.name,
                    path: item.path,
                    download_url: item.download_url,
                    size: item.size,
                });
            }
        }

        return fetchedFiles;
    };

    return (
        <div className="explorer-container">
            <h1 className="header">Create Project</h1>
            <p className="description">
                Enter the following to create a new project
            </p>

            <div className="repo-input-container">
                <input
                    className="repo-input-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Project Title"
                />
                <input
                    className="repo-input-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Project Description"
                />
                <input
                    className="repo-input-github"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                />
                <button
                    className="explore-button"
                    onClick={fetchRepoData}
                    disabled={!repoUrl || isLoading}
                >
                    {isLoading ? 'Loading...' : 'Create Project'}
                </button>
            </div>

            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}
        </div>
    );
}

export default GitHubFileExplorer;
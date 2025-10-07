import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Project.css';

function GitHubFileExplorer() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [token, setToken] = useState(''); // <-- NEW: GitHub token state

  // robust parse: https://github.com/<owner>/<repo>[.git][...]
  function parseOwnerRepo(url) {
    if (!url) return null;
    const m = url.trim().match(/github\.com\/([^/]+)\/([^/?#]+)(?:\.git)?/i);
    return m ? { owner: m[1], repo: m[2] } : null;
  }

  // helper: fetch with token if provided
  async function fetchWithAuth(url) {
    const headers = token ? { Authorization: `token ${token}` } : {};
    return fetch(url, { headers });
  }

const fetchRepoData = async () => {
  try {
    setIsLoading(true);
    setError(null);

    const parsed = parseOwnerRepo(repoUrl);
    if (!parsed) throw new Error('Please enter a valid GitHub URL like https://github.com/owner/repository');
    const { owner, repo } = parsed;
    const repoKey = `${owner}/${repo}`;

    const repoResponse = await fetchWithAuth(`https://api.github.com/repos/${owner}/${repo}`);
    if (!repoResponse.ok) throw new Error(`Failed to fetch repository info. (status ${repoResponse.status})`);
    const repoData = await repoResponse.json();

    const files = await fetchFiles(owner, repo);

    // Save the project to DB
    const saveRes = await fetch('http://localhost:3000/api/project-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        githubUrl: repoUrl,
        token,
        ownerId: "67e251f2b3284216506a470f", // <--- this is hard coded for now but change later!!!!-------------------------------------------------------------------------
      }),
    });

    if (!saveRes.ok) throw new Error('Failed to create project in database');

    const { insertedId } = await saveRes.json();

    // Navigate to repo page
    navigate('/repositorypage', {
      state: {
        repoInfo: {
          name: title || repoData.name || repo,
          description: description || repoData.description || '',
          githubUrl: repoUrl,
        },
        repoKey,
        files,
        projectId: insertedId, // pass to next page
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
    const response = await fetchWithAuth(apiUrl);
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
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

  // display for creating a project
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
          <input
              className="repo-input-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Optional: GitHub Personal Access Token"
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

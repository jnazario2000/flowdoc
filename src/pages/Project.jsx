import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Project.css';
import axios from 'axios'; // (kept; not used, but you said no major changes)

function GitHubFileExplorer() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // robust parse: https://github.com/<owner>/<repo>[.git][...]
  function parseOwnerRepo(url) {
    if (!url) return null;
    const m = url.trim().match(/github\.com\/([^/]+)\/([^/?#]+)(?:\.git)?/i);
    return m ? { owner: m[1], repo: m[2] } : null;
  }

  // goes into github and gets repo info and files
  const fetchRepoData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const parsed = parseOwnerRepo(repoUrl);
      if (!parsed) throw new Error('Please enter a valid GitHub URL like https://github.com/owner/repository');
      const { owner, repo } = parsed;
      const repoKey = `${owner}/${repo}`;

      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!repoResponse.ok) throw new Error("Failed to fetch repository info.");
      const repoData = await repoResponse.json();

      const files = await fetchFiles(owner, repo);

      // goes to a new page to display repo info
      navigate('/repositorypage', {
        state: {
          repoInfo: {
            name: title || repoData.name || repo,
            description: description || repoData.description || '',
            githubUrl: repoUrl,                 // <-- pass url so repoKey can also be derived there
          },
          repoKey,                               // <-- IMPORTANT: owner/repo for the editor route
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
  // uses recursion to keep adding files
  const fetchFiles = async (owner, repo, urlPath = '') => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${urlPath}`;
    const response = await fetch(apiUrl);
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
          path: item.path,           // repo-relative (what we want)
          download_url: item.download_url,
          size: item.size,
        });
      }
    }

    return fetchedFiles;
  };

  // display for creating a project paired with project.css
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

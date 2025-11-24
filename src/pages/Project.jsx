import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../utils/authUtils';
import '../styles.css';

function GitHubFileExplorer() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [token, setToken] = useState(''); // GitHub token for private repos
  const [isPrivate, setIsPrivate] = useState(false); // Privacy setting
  const [currentUser, setCurrentUser] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/signin');
      return;
    }
    setCurrentUser(getCurrentUser());
  }, [navigate]);

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

    // Determine if private based on token requirement
    const requiresToken = !!token;
    const privateStatus = isPrivate || requiresToken;

    console.log('Privacy settings:', {
      isPrivateCheckbox: isPrivate,
      requiresToken: requiresToken,
      finalPrivateStatus: privateStatus
    });

    // Save the project to DB
    const saveRes = await fetch('http://localhost:3000/api/project-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        githubUrl: repoUrl,
        token,
        ownerId: currentUser._id || currentUser.id,
      }),
    });

    if (!saveRes.ok) throw new Error('Failed to create project in database');

    const { insertedId } = await saveRes.json();

    // Create repository entry for access control
    const repositoryData = {
      repoKey,
      name: title || repoData.name || repo,
      description: description || repoData.description || '',
      githubUrl: repoUrl,
      isPrivate: privateStatus,
      ownerId: currentUser._id || currentUser.id,
      ownerUsername: currentUser.username,
    };
    
    console.log('Creating repository with data:', repositoryData);
    
    const repoCreateRes = await fetch('http://localhost:3000/api/repositories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repositoryData),
    });

    if (!repoCreateRes.ok) {
      // Repository might already exist, which is okay
      const errorData = await repoCreateRes.json();
      console.error('Repository creation response:', errorData);
      if (errorData.message !== 'Repository already exists') {
        console.warn('Failed to create repository entry:', errorData.message);
      }
    } else {
      const repoResult = await repoCreateRes.json();
      console.log('Repository created successfully:', repoResult);
    }

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
        token: token, // pass token for private repo access
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
        <button
            className="back-button"
            onClick={() => navigate(-1)}
            style={{marginBottom: "1rem"}}
        >
          ⬅ Back
        </button>
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '1rem 0',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px'
          }}>
            <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={(e) => {
                  console.log('Privacy checkbox changed to:', e.target.checked);
                  setIsPrivate(e.target.checked);
                }}
                style={{width: 'auto', cursor: 'pointer'}}
            />
            <label htmlFor="isPrivate" style={{cursor: 'pointer', margin: 0}}>
              <strong>Make this a private project</strong> (requires access token, only you and invited collaborators
              can view)
            </label>
          </div>
          {token && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '6px',
                fontSize: '0.9rem',
                marginBottom: '1rem'
              }}>
                🔒 Note: Using a GitHub token will automatically make this project private
              </div>
          )}
          <button
              className="explore-button"
              onClick={fetchRepoData}
              disabled={!repoUrl || isLoading || !currentUser}
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../utils/authUtils';
import '../styles.css';

const API = import.meta.env.VITE_API_URL || '';

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
  const [parsedRepo, setParsedRepo] = useState(null); // Show parsed owner/repo

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/signin');
      return;
    }
    setCurrentUser(getCurrentUser());
  }, [navigate]);

  // Parse and display repository info whenever URL changes
  useEffect(() => {
    const parsed = parseOwnerRepo(repoUrl);
    setParsedRepo(parsed);
  }, [repoUrl]);

  // robust parse: https://github.com/<owner>/<repo>[.git][...]
  function parseOwnerRepo(url) {
    if (!url) return null;
    const m = url.trim().match(/github\.com\/([^/]+)\/([^/?#]+)/i);
    if (!m) return null;
    
    // Remove .git suffix if present
    let repo = m[2];
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }
    
    return { owner: m[1], repo };
  }

  // helper: fetch with token if provided
  async function fetchWithAuth(url) {
    const headers = {};
    if (token) {
      // Try Bearer format first (modern), fallback to token format
      headers['Authorization'] = `Bearer ${token}`;
    }
    console.log('Fetching URL:', url);
    console.log('Using token:', token ? 'Yes (Bearer format)' : 'No');
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

    console.log('Attempting to fetch repository:', { owner, repo, repoKey });

    // First attempt with Bearer token (if provided)
    let repoResponse = await fetchWithAuth(`https://api.github.com/repos/${owner}/${repo}`);
    
    // If Bearer fails with 401 and we have a token, try legacy token format
    if (!repoResponse.ok && repoResponse.status === 401 && token) {
      console.log('Bearer format failed, trying legacy token format...');
      const headers = { Authorization: `token ${token}` };
      repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    }
    
    // Better error handling for GitHub API
    if (!repoResponse.ok) {
      const errorData = await repoResponse.json().catch(() => ({}));
      console.error('GitHub API Error:', errorData);
      
      if (repoResponse.status === 401) {
        throw new Error('GitHub token is invalid or expired. Please generate a new token with "repo" scope.');
      } else if (repoResponse.status === 404) {
        if (token) {
          throw new Error(`Repository "${repoKey}" not found or token doesn't have access. Check: 1) Repository URL is correct 2) Token has "repo" scope 3) Token owner has access to this repository`);
        } else {
          throw new Error(`Repository "${repoKey}" not found or is private. If it's private, please provide a GitHub Personal Access Token.`);
        }
      } else if (repoResponse.status === 403) {
        throw new Error('Access forbidden. Your token may not have the required permissions (needs "repo" scope).');
      }
      throw new Error(`Failed to fetch repository info. (status ${repoResponse.status}) ${errorData.message || ''}`);
    }
    
    const repoData = await repoResponse.json();
    console.log('Repository data fetched successfully:', { name: repoData.name, private: repoData.private });
    
    // Check if repo is private and warn if no token provided
    if (repoData.private && !token) {
      throw new Error('This is a private repository. Please provide a GitHub Personal Access Token.');
    }

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
    const saveRes = await fetch(`${API}/api/project-pages`, {
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
    
    const repoCreateRes = await fetch(`${API}/api/repositories`, {
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
    let response = await fetchWithAuth(apiUrl);
    
    // Try legacy token format if Bearer fails
    if (!response.ok && response.status === 401 && token) {
      console.log('Bearer format failed for contents, trying legacy token format...');
      const headers = { Authorization: `token ${token}` };
      response = await fetch(apiUrl, { headers });
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`GitHub API ${response.status}: ${errorData.message || 'Failed to fetch files'}`);
    }
    
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
          
          {/* Show parsed repository info */}
          {parsedRepo && (
              <div style={{
                padding: '0.5rem',
                backgroundColor: '#e8f5e9',
                border: '1px solid #4caf50',
                borderRadius: '4px',
                fontSize: '0.9rem',
                marginBottom: '0.5rem'
              }}>
                ✓ Will fetch: <strong>{parsedRepo.owner}/{parsedRepo.repo}</strong>
              </div>
          )}
          {repoUrl && !parsedRepo && (
              <div style={{
                padding: '0.5rem',
                backgroundColor: '#ffebee',
                border: '1px solid #f44336',
                borderRadius: '4px',
                fontSize: '0.9rem',
                marginBottom: '0.5rem'
              }}>
                ⚠ Invalid GitHub URL format
              </div>
          )}
          
          <input
              className="repo-input-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Optional: GitHub Personal Access Token (required for private repos)"
          />
          
          {/* Token Help Message */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#e7f3ff',
            border: '1px solid #0066cc',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            <strong>🔑 Need a GitHub Token?</strong>
            <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
              <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>GitHub Settings → Developer Settings → Personal Access Tokens</a></li>
              <li>Click "Generate new token (classic)"</li>
              <li>Give it a name and select the <strong>"repo"</strong> scope (full control of private repositories)</li>
              <li>Click "Generate token" and copy it here</li>
            </ol>
          </div>
          
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

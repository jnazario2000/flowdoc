// src/pages/RepositoryPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import { getCurrentUser, isAuthenticated } from "../utils/authUtils";
import InvitationManager from "../components/InvitationManager";
import "../styles.css";

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function RepositoryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    // Try to get repoKey from multiple sources
    const { repoInfo, repoKey: stateRepoKey, projectId, token: stateToken } = location.state || {};
    const repoKey = stateRepoKey || params.repoKey;

    const [files, setFiles] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [docsLoading, setDocsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateDoc, setShowCreateDoc] = useState(false);
    const [newDocPath, setNewDocPath] = useState("");
    const [createDocError, setCreateDocError] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [currentFolder, setCurrentFolder] = useState('');
    const [token, setToken] = useState(stateToken || null);
    
    // To-do list state
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState('');
    const [showTodoForm, setShowTodoForm] = useState(false);
    
    // Edit description state
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState(repoInfo?.description || '');
    
    // Anchor tracking state
    const [fileAnchorCounts, setFileAnchorCounts] = useState({});
    const [showOnlyUndocumented, setShowOnlyUndocumented] = useState(false);
    
    // Access control state
    const [repository, setRepository] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [showInvitationManager, setShowInvitationManager] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [accessChecking, setAccessChecking] = useState(true);
    const [defaultBranch, setDefaultBranch] = useState('main');

    // --- helpers ---
    const stripGitHubBlob = (p) => p || "";

    const since = (dateString) => {
        if (!dateString) return "Just now";
        const d = new Date(dateString);
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        return days <= 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} ago`;
    };

    // Fetch token from database if not in state
    useEffect(() => {
        const fetchToken = async () => {
            if (!token && repoKey) {
                try {
                    const encodedRepoKey = encodeURIComponent(repoKey);
                    const res = await fetch(`${API}/api/project-pages/by-repo?repoKey=${encodedRepoKey}`);
                    if (res.ok) {
                        const project = await res.json();
                        if (project.token) {
                            setToken(project.token);
                            console.log('Token retrieved from database');
                        }
                    }
                } catch (err) {
                    console.error('Error fetching token:', err);
                }
            }
        };
        
        fetchToken();
    }, [repoKey, token]);

    // Detect default branch from GitHub
    useEffect(() => {
        const detectDefaultBranch = async () => {
            if (!repoKey) return;
            
            try {
                const [owner, repo] = repoKey.split('/');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
                
                // Try legacy token format if Bearer fails
                if (!res.ok && res.status === 401 && token) {
                    headers['Authorization'] = `token ${token}`;
                    const retryRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
                    if (retryRes.ok) {
                        const data = await retryRes.json();
                        setDefaultBranch(data.default_branch || 'main');
                        console.log('Detected default branch:', data.default_branch);
                        return;
                    }
                }
                
                if (res.ok) {
                    const data = await res.json();
                    setDefaultBranch(data.default_branch || 'main');
                    console.log('Detected default branch:', data.default_branch);
                } else {
                    console.warn('Could not detect default branch, using "main"');
                }
            } catch (err) {
                console.error('Error detecting default branch:', err);
            }
        };
        
        detectDefaultBranch();
    }, [repoKey, token]);

    // --- fetch directory contents from GitHub (non-recursive) ---
    const fetchDirectoryContents = async (owner, repo, path = "") => {
        try {
            // Don't add trailing slash if path is empty
            const url = path 
                ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
                : `https://api.github.com/repos/${owner}/${repo}/contents`;
            
            console.log('Fetching:', url);
            console.log('Token present:', !!token);
            console.log('Token first 10 chars:', token ? token.substring(0, 10) + '...' : 'none');
            
            // Try Bearer format first (recommended)
            let headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            let res = await fetch(url, { headers });
            
            // If Bearer fails with 401, try legacy 'token' format
            if (!res.ok && res.status === 401 && token) {
                console.log('Bearer format failed, trying legacy token format...');
                headers['Authorization'] = `token ${token}`;
                res = await fetch(url, { headers });
            }
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('GitHub API error:', {
                    status: res.status,
                    statusText: res.statusText,
                    url,
                    hasToken: !!token,
                    message: errorData.message,
                    documentation_url: errorData.documentation_url
                });
                
                // Provide more helpful error messages
                let errorMessage = `GitHub API error: ${res.status}`;
                if (res.status === 401) {
                    errorMessage += ' - Invalid or expired token. Please check your GitHub token has the "repo" scope.';
                } else if (res.status === 404) {
                    errorMessage += ' - Repository not found. Check that the repository name is correct and your token has access.';
                } else if (errorData.message) {
                    errorMessage += ` - ${errorData.message}`;
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await res.json();

            const items = [];
            for (const item of data) {
                items.push({
                    name: item.name,
                    path: item.path,
                    type: item.type, // 'file' or 'dir'
                    download_url: item.download_url,
                    size: item.size,
                    lastEdited: item?.git_url || null,
                });
            }
            return items;
        } catch (err) {
            console.error('fetchDirectoryContents error:', err);
            setError(err.message);
            return [];
        }
    };

    // Load files from GitHub for current folder
    useEffect(() => {
        const loadFiles = async () => {
            setLoading(true);
            if (!repoKey) {
                setError("No repo key provided");
                setLoading(false);
                return;
            }

            const [owner, repo] = repoKey.split("/");
            const fetchedItems = await fetchDirectoryContents(owner, repo, currentFolder);
            setFiles(fetchedItems);
            setLoading(false);
        };

        loadFiles();
    }, [repoKey, token, currentFolder]);

    // Load documents from database
    useEffect(() => {
        const loadDocuments = async () => {
            if (!repoKey) {
                setDocsLoading(false);
                return;
            }

            setDocsLoading(true);
            try {
                // Fetch all documents for this repository
                const res = await fetch(`${API}/api/documents/list?repoKey=${encodeURIComponent(repoKey)}`);
                if (res.ok) {
                    const data = await res.json();
                    setDocuments(data.documents || []);
                } else {
                    console.error('Failed to load documents');
                }
            } catch (err) {
                console.error('Error loading documents:', err);
            } finally {
                setDocsLoading(false);
            }
        };

        loadDocuments();
    }, [repoKey]);

    // Load anchors for all files
    useEffect(() => {
        const loadAnchors = async () => {
            if (!repoKey || documents.length === 0) return;
            
            try {
                // Create a map to count anchors per file
                const anchorCounts = {};
                
                // Go through each document and count anchors by file path
                for (const doc of documents) {
                    if (doc.anchors && Array.isArray(doc.anchors)) {
                        for (const anchor of doc.anchors) {
                            // The docSpan field contains the file path this anchor points to
                            const filePath = anchor.docSpan;
                            if (filePath) {
                                anchorCounts[filePath] = (anchorCounts[filePath] || 0) + 1;
                            }
                        }
                    }
                }
                
                setFileAnchorCounts(anchorCounts);
            } catch (err) {
                console.error('Error loading anchors:', err);
            }
        };
        
        loadAnchors();
    }, [repoKey, documents]);

    // Check repository access and ownership
    useEffect(() => {
        const checkRepositoryAccess = async () => {
            if (!repoKey) {
                setAccessChecking(false);
                return;
            }
            
            setAccessChecking(true);
            setAccessDenied(false);
            
            try {
                // Check if user is authenticated
                if (!isAuthenticated()) {
                    // Allow access to public repos, but we need to check first
                    const res = await fetch(`${API}/api/repositories/${encodeURIComponent(repoKey)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setRepository(data.repository);
                        
                        if (data.repository.isPrivate) {
                            // Private repo requires authentication
                            setAccessDenied(true);
                            setAccessChecking(false);
                            return;
                        }
                    }
                    // If repo doesn't exist in DB or is public, allow access (legacy support)
                    setAccessChecking(false);
                    return;
                }
                
                const user = getCurrentUser();
                setCurrentUser(user);
                const userId = user._id || user.id;
                
                // Load repository metadata and check access
                const res = await fetch(`${API}/api/repositories/${encodeURIComponent(repoKey)}/access?userId=${userId}`);
                
                if (res.ok) {
                    const accessInfo = await res.json();
                    
                    if (accessInfo.repository) {
                        setRepository(accessInfo.repository);
                        setIsOwner(accessInfo.isOwner);
                        
                        // Check if user has access
                        if (!accessInfo.hasAccess) {
                            setAccessDenied(true);
                        }
                    } else {
                        // Repository doesn't exist in DB - allow access for legacy support
                        console.log('Repository not in RBAC system, allowing access');
                    }
                } else {
                    console.warn('Could not check repository access');
                }
            } catch (err) {
                console.error('Error checking repository access:', err);
            } finally {
                setAccessChecking(false);
            }
        };
        
        checkRepositoryAccess();
    }, [repoKey]);

    // Get current folder's files and subfolders from the fetched items
    const currentFolderContent = useMemo(() => {
        const folders = [];
        let filesOnly = [];
        
        // Separate folders and files
        files.forEach(item => {
            if (item.type === 'dir') {
                folders.push(item.name);
            } else {
                filesOnly.push({
                    path: item.path,
                    name: item.name,
                    size: item.size ?? "-",
                    lastEdited: item.lastEdited,
                });
            }
        });
        
        // Filter for undocumented files if toggle is enabled
        if (showOnlyUndocumented) {
            filesOnly = filesOnly.filter(file => {
                const anchorCount = fileAnchorCounts[file.path] || 0;
                return anchorCount === 0;
            });
        }
        
        return {
            files: filesOnly,
            folders: folders.sort()
        };
    }, [files, showOnlyUndocumented, fileAnchorCounts]);

    const navigateToFolder = (folderName) => {
        const newPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;
        setCurrentFolder(newPath);
    };

    const navigateUp = () => {
        const parts = currentFolder.split('/');
        parts.pop();
        setCurrentFolder(parts.join('/'));
    };

    const openEditor = (filePath = null) => {
        if (!repoKey) {
            console.error("Cannot open editor: repoKey is missing");
            alert("Repository information is missing. Please go back and select the repository again.");
            return;
        }

        console.log("Opening editor with:", { repoKey, filePath }); // Debug log

        const params = new URLSearchParams({
            repoKey: repoKey,
            branch: defaultBranch // Use detected default branch
        });
        
        // Only add path if one is provided
        if (filePath) {
            params.append('path', filePath);
        }

        const editorUrl = `/editor?${params.toString()}`;
        console.log("Navigating to:", editorUrl); // Debug log
        
        // Navigate with state so EditorPage can link back to repository
        navigate(editorUrl, { state: { repoKey, repoInfo, token } });
    };

    const createDocument = async () => {
        if (!newDocPath.trim()) {
            setCreateDocError("Document path is required");
            return;
        }

        if (!repoKey) {
            setCreateDocError("Repository information is missing");
            return;
        }

        try {
            const res = await fetch(`${API}/api/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoKey,
                    path: newDocPath.trim(),
                    body: "",
                    branch: "main"
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 409) {
                    // Document already exists, just open it
                    setShowCreateDoc(false);
                    setNewDocPath("");
                    setCreateDocError(null);
                    openEditor(newDocPath.trim());
                } else {
                    setCreateDocError(data.error || "Failed to create document");
                }
                return;
            }

            // Success - reload documents and open the new document
            setShowCreateDoc(false);
            setNewDocPath("");
            setCreateDocError(null);
            
            // Reload documents list
            const docsRes = await fetch(`${API}/api/documents/list?repoKey=${encodeURIComponent(repoKey)}`);
            if (docsRes.ok) {
                const docsData = await docsRes.json();
                setDocuments(docsData.documents || []);
            }
            
            openEditor(newDocPath.trim());
        } catch (err) {
            console.error("Error creating document:", err);
            setCreateDocError("Failed to create document: " + err.message);
        }
    };

    const deleteDocument = async (docPath) => {
        if (!confirm(`Are you sure you want to delete "${docPath}"?`)) {
            return;
        }

        try {
            const res = await fetch(`${API}/api/documents?repoKey=${encodeURIComponent(repoKey)}&path=${encodeURIComponent(docPath)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Remove from local state
                setDocuments(docs => docs.filter(doc => doc.path !== docPath));
            } else {
                const data = await res.json();
                alert('Error deleting document: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error deleting document:', err);
            alert('Error deleting document: ' + err.message);
        }
    };

    const importFileAsDocument = async (file) => {
        if (!repoKey) {
            alert('Repository information is missing');
            return;
        }

        // Check if this file is already imported as a document
        const existingDoc = documents.find(doc => doc.path === file.path);
        if (existingDoc) {
            const confirmOpen = confirm(`This file is already imported as a document. Do you want to open it in the editor?`);
            if (confirmOpen) {
                openEditor(file.path);
            }
            return;
        }

        try {
            // Fetch the file content from GitHub
            const [owner, repo] = repoKey.split('/');
            const headers = token ? { Authorization: `token ${token}` } : {};
            const contentRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
                { headers }
            );

            if (!contentRes.ok) {
                throw new Error('Failed to fetch file content from GitHub');
            }

            const contentData = await contentRes.json();
            
            // GitHub returns content as base64 encoded
            let fileContent = '';
            if (contentData.content) {
                fileContent = atob(contentData.content);
            } else if (contentData.download_url) {
                // Fallback: fetch from download URL
                const downloadRes = await fetch(contentData.download_url);
                fileContent = await downloadRes.text();
            }

            // Determine the document path - keep original extension or convert to .md
            let docPath = file.path;
            const isMarkdown = file.path.toLowerCase().endsWith('.md');
            
            if (!isMarkdown) {
                // Ask user if they want to convert to .md
                const convertToMd = confirm(
                    `This file is not a Markdown file (.md). Would you like to save it as "${file.path}.md"?\n\n` +
                    `Click OK to add .md extension, or Cancel to keep original extension.`
                );
                if (convertToMd) {
                    docPath = `${file.path}.md`;
                }
            }

            // Create document in database
            const res = await fetch(`${API}/api/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoKey,
                    path: docPath,
                    body: fileContent,
                    branch: 'main'
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to import document');
            }

            // Reload documents list
            const docsRes = await fetch(`${API}/api/documents/list?repoKey=${encodeURIComponent(repoKey)}`);
            if (docsRes.ok) {
                const docsData = await docsRes.json();
                setDocuments(docsData.documents || []);
            }

            // Open in editor
            alert(`Successfully imported "${file.path}" as documentation!`);
            openEditor(docPath);

        } catch (err) {
            console.error('Error importing file:', err);
            alert('Error importing file: ' + err.message);
        }
    };

    // To-do list functions
    const addTodo = () => {
        if (!newTodo.trim()) return;
        setTodos([...todos, { id: Date.now(), text: newTodo, completed: false }]);
        setNewTodo('');
        setShowTodoForm(false);
    };

    const toggleTodo = (id) => {
        setTodos(todos.map(todo => 
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    };

    const deleteTodo = (id) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const saveDescription = () => {
        // In a real app, you'd save this to your database
        // For now, we'll just update the local state
        if (repoInfo) {
            repoInfo.description = editedDescription;
        }
        setIsEditingDescription(false);
    };

    const cancelDescriptionEdit = () => {
        setEditedDescription(repoInfo?.description || '');
        setIsEditingDescription(false);
    };

    // --- UI ---
    
    // Show loading while checking access
    if (accessChecking) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ fontSize: '2rem' }}>🔍</div>
                <h2>Checking Access...</h2>
                <p style={{ color: '#666' }}>Verifying your permissions for this repository...</p>
            </div>
        );
    }
    
    // Show access denied screen
    if (accessDenied) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column',
                gap: '1.5rem',
                padding: '2rem'
            }}>
                <div style={{ fontSize: '4rem' }}>🔒</div>
                <h1 style={{ color: '#dc3545', margin: 0 }}>Access Denied</h1>
                <p style={{ 
                    fontSize: '1.1rem', 
                    color: '#666', 
                    textAlign: 'center',
                    maxWidth: '600px'
                }}>
                    {repository?.isPrivate 
                        ? "This is a private repository. You don't have permission to access it."
                        : "You need to be signed in to access this repository."}
                </p>
                {!isAuthenticated() ? (
                    <button 
                        onClick={() => navigate('/signin')}
                        style={{ 
                            padding: '0.75rem 2rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}
                    >
                        Sign In
                    </button>
                ) : (
                    <p style={{ fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
                        If you believe you should have access, please contact the repository owner for an invitation.
                    </p>
                )}
                <button 
                    onClick={() => navigate('/')}
                    style={{ 
                        padding: '0.75rem 2rem',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginTop: '1rem'
                    }}
                >
                    ← Back to Home
                </button>
            </div>
        );
    }

    // --- Main UI ---
    return (
        <div className="project-container">
            <header className="project-header">
                <div className="header-top">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Link to="/" className="back-button">← Back to Home</Link>
                    </div>
                </div>
                <div className="header-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className="project-title">{repoInfo?.name || repoKey}</h1>
                            {repository && repository.isPrivate && (
                                <span style={{
                                    display: 'inline-block',
                                    backgroundColor: '#ffc107',
                                    color: '#000',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '4px',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    marginTop: '0.5rem'
                                }}>
                                    🔒 Private Repository
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {isOwner && repository && repository.isPrivate && (
                                <button 
                                    className="edit-button"
                                    onClick={() => setShowInvitationManager(true)}
                                    style={{ 
                                        padding: '0.4rem 0.8rem', 
                                        fontSize: '0.9em',
                                        backgroundColor: '#28a745',
                                        borderColor: '#28a745',
                                        color: 'white'
                                    }}
                                >
                                    👥 Manage Access
                                </button>
                            )}
                            {!isEditingDescription && (
                                <button 
                                    className="edit-button"
                                    onClick={() => setIsEditingDescription(true)}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.9em' }}
                                >
                                    ✏️ Edit Description
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {isEditingDescription ? (
                        <div style={{ marginTop: '1rem' }}>
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                placeholder="Enter project description..."
                                style={{
                                    width: '100%',
                                    minHeight: '80px',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5da',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button 
                                    className="save-button"
                                    onClick={saveDescription}
                                    style={{ padding: '0.4rem 1rem' }}
                                >
                                    Save
                                </button>
                                <button 
                                    className="cancel-button"
                                    onClick={cancelDescriptionEdit}
                                    style={{ padding: '0.4rem 1rem' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="project-description">
                            {repoInfo?.description || editedDescription || 'No description provided.'}
                        </p>
                    )}
                </div>
            </header>

            <div className="project-content">
                {/* To-Do List Section */}
                <section className="files-section" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2>✅ Documentation Goals</h2>
                        <button 
                            className="edit-button" 
                            onClick={() => setShowTodoForm(!showTodoForm)}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            {showTodoForm ? "Cancel" : "+ Add Goal"}
                        </button>
                    </div>

                    {showTodoForm && (
                        <div style={{ 
                            padding: '1rem', 
                            marginBottom: '1rem', 
                            border: '1px solid #ddd', 
                            borderRadius: '4px',
                            backgroundColor: '#f9f9f9'
                        }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <input
                                    type="text"
                                    placeholder="Enter a documentation goal..."
                                    value={newTodo}
                                    onChange={(e) => setNewTodo(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                                    style={{ 
                                        flex: 1,
                                        padding: '0.5rem',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px'
                                    }}
                                />
                                <button 
                                    className="edit-button" 
                                    onClick={addTodo}
                                    style={{ padding: '0.5rem 1.5rem' }}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    {todos.length === 0 ? (
                        <div style={{ 
                            padding: '2rem', 
                            textAlign: 'center', 
                            backgroundColor: '#f9f9f9', 
                            borderRadius: '4px',
                            border: '1px dashed #ccc'
                        }}>
                            <p style={{ margin: 0, opacity: 0.7 }}>
                                No goals set yet. Click "+ Add Goal" to start planning your documentation.
                            </p>
                        </div>
                    ) : (
                        <div style={{ 
                            border: '1px solid #e1e4e8', 
                            borderRadius: '6px',
                            backgroundColor: '#fff'
                        }}>
                            {todos.map((todo, index) => (
                                <div 
                                    key={todo.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        borderBottom: index < todos.length - 1 ? '1px solid #e1e4e8' : 'none',
                                        backgroundColor: todo.completed ? '#f6f8fa' : '#fff'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={todo.completed}
                                        onChange={() => toggleTodo(todo.id)}
                                        style={{ 
                                            width: '18px', 
                                            height: '18px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{
                                        flex: 1,
                                        textDecoration: todo.completed ? 'line-through' : 'none',
                                        color: todo.completed ? '#6a737d' : '#24292e',
                                        opacity: todo.completed ? 0.7 : 1
                                    }}>
                                        {todo.text}
                                    </span>
                                    <button
                                        onClick={() => deleteTodo(todo.id)}
                                        className="edit-button"
                                        style={{
                                            padding: '0.3rem 0.6rem',
                                            fontSize: '0.85em',
                                            backgroundColor: '#dc3545',
                                            borderColor: '#dc3545',
                                            color: '#fff'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Documents Section */}
                <section className="files-section" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2>📄 Documentation Files</h2>
                        <button 
                            className="edit-button" 
                            onClick={() => setShowCreateDoc(!showCreateDoc)}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            {showCreateDoc ? "Cancel" : "+ Create Document"}
                        </button>
                    </div>

                    {showCreateDoc && (
                        <div style={{ 
                            padding: '1rem', 
                            marginBottom: '1rem', 
                            border: '1px solid #ddd', 
                            borderRadius: '4px',
                            backgroundColor: '#f9f9f9'
                        }}>
                            <h3 style={{ marginTop: 0 }}>Create New Document</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        placeholder="Enter document path (e.g., docs/README.md)"
                                        value={newDocPath}
                                        onChange={(e) => setNewDocPath(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && createDocument()}
                                        style={{ 
                                            width: '100%', 
                                            padding: '0.5rem',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                    />
                                    {createDocError && (
                                        <p style={{ color: 'red', fontSize: '0.9em', margin: '0.5rem 0 0 0' }}>
                                            {createDocError}
                                        </p>
                                    )}
                                </div>
                                <button 
                                    className="edit-button" 
                                    onClick={createDocument}
                                    style={{ padding: '0.5rem 1.5rem' }}
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    )}

                    {docsLoading && <p>Loading documents...</p>}
                    {!docsLoading && documents.length === 0 && (
                        <div style={{ 
                            padding: '2rem', 
                            textAlign: 'center', 
                            backgroundColor: '#f9f9f9', 
                            borderRadius: '4px',
                            border: '1px dashed #ccc'
                        }}>
                            <p style={{ margin: 0, opacity: 0.7 }}>
                                No documentation files yet. Click "+ Create Document" to get started.
                            </p>
                        </div>
                    )}
                    {!docsLoading && documents.length > 0 && (
                        <div className="files-table-container">
                            <table className="files-table">
                                <thead>
                                <tr>
                                    <th>Document Path</th>
                                    <th>Anchors</th>
                                    <th>Last Updated</th>
                                    <th></th>
                                </tr>
                                </thead>
                                <tbody>
                                {documents.map(doc => (
                                    <tr key={doc.path}>
                                        <td style={{ fontWeight: 500 }}>📝 {doc.path}</td>
                                        <td>{doc.anchors?.length || 0}</td>
                                        <td>{since(doc.updatedAt)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button 
                                                    className="edit-button" 
                                                    onClick={() => openEditor(doc.path)}
                                                    style={{ padding: '0.4rem 0.8rem' }}
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    className="edit-button" 
                                                    onClick={() => deleteDocument(doc.path)}
                                                    style={{ 
                                                        padding: '0.4rem 0.8rem',
                                                        backgroundColor: '#dc3545',
                                                        borderColor: '#dc3545'
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Repository Files Section */}
                <section className="files-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2>📂 Repository Files</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button 
                                onClick={() => setShowOnlyUndocumented(!showOnlyUndocumented)}
                                className="edit-button"
                                style={{ 
                                    padding: '0.4rem 0.8rem',
                                    backgroundColor: showOnlyUndocumented ? '#28a745' : '#f6f8fa',
                                    color: showOnlyUndocumented ? 'white' : '#24292e',
                                    borderColor: showOnlyUndocumented ? '#28a745' : '#e1e4e8'
                                }}
                            >
                                {showOnlyUndocumented ? '✓ ' : ''}Show Undocumented Only
                            </button>
                            {currentFolder && (
                                <button 
                                    onClick={navigateUp}
                                    className="edit-button"
                                    style={{ padding: '0.4rem 0.8rem' }}
                                >
                                    ⬆️ Up to Parent
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Breadcrumb */}
                    {currentFolder && (
                        <div style={{ 
                            marginBottom: '1rem', 
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f0f0f0',
                            borderRadius: '4px',
                            fontSize: '0.9em'
                        }}>
                            <strong>Current folder:</strong> /{currentFolder}
                        </div>
                    )}

                    {loading && <p>Loading files...</p>}
                    {error && <p style={{ color: "red" }}>Error: {error}</p>}
                    {!loading && !files.length && !error && <div>No files found.</div>}
                    {!loading && files.length > 0 && (
                        <div style={{ 
                            maxHeight: '500px', 
                            overflowY: 'auto',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}>
                            <table className="files-table" style={{ marginBottom: 0 }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9f9f9', zIndex: 1 }}>
                                <tr>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Documentation</th>
                                    <th>Last Edited</th>
                                    <th></th>
                                </tr>
                                </thead>
                                <tbody>
                                {/* Folders */}
                                {currentFolderContent.folders.map(folder => (
                                    <tr 
                                        key={folder}
                                        style={{ 
                                            cursor: 'pointer',
                                            backgroundColor: '#f8f9fa'
                                        }}
                                        onClick={() => navigateToFolder(folder)}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1.2em' }}>📁</span>
                                                <strong>{folder}/</strong>
                                            </div>
                                        </td>
                                        <td>-</td>
                                        <td>-</td>
                                        <td>-</td>
                                        <td>
                                            <button 
                                                className="edit-button" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigateToFolder(folder);
                                                }}
                                                style={{ padding: '0.4rem 0.8rem' }}
                                            >
                                                Open
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                
                                {/* Files */}
                                {currentFolderContent.files.map(file => {
                                    const anchorCount = fileAnchorCounts[file.path] || 0;
                                    const hasAnchors = anchorCount > 0;
                                    
                                    // Check if this file is already imported as a document
                                    const isImported = documents.some(doc => 
                                        doc.path === file.path || doc.path === `${file.path}.md`
                                    );
                                    
                                    return (
                                        <tr key={file.path}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '1em' }}>📄</span>
                                                    {file.name}
                                                    {isImported && (
                                                        <span style={{ 
                                                            fontSize: '0.75em', 
                                                            backgroundColor: '#17a2b8',
                                                            color: 'white',
                                                            padding: '2px 6px',
                                                            borderRadius: '3px',
                                                            fontWeight: 500
                                                        }}>
                                                            IMPORTED
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{file.size}</td>
                                            <td>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.5rem',
                                                    fontSize: '0.9em'
                                                }}>
                                                    {hasAnchors ? (
                                                        <>
                                                            <span style={{ color: '#28a745', fontSize: '1.2em' }}>✓</span>
                                                            <span style={{ color: '#28a745', fontWeight: 500 }}>
                                                                {anchorCount} anchor{anchorCount !== 1 ? 's' : ''}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span style={{ color: '#dc3545', fontSize: '1.2em' }}>○</span>
                                                            <span style={{ color: '#6c757d', fontStyle: 'italic' }}>
                                                                Undocumented
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{since(file.lastEdited)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button 
                                                        className="edit-button" 
                                                        onClick={() => {
                                                            // Set initial code file and open editor
                                                            const params = new URLSearchParams({
                                                                repoKey: repoKey,
                                                                branch: defaultBranch,
                                                                codeFile: file.path
                                                            });
                                                            navigate(`/editor?${params.toString()}`, { 
                                                                state: { repoKey, repoInfo, initialCodeFile: file.path, token } 
                                                            });
                                                        }}
                                                        style={{ padding: '0.4rem 0.8rem' }}
                                                    >
                                                        View
                                                    </button>
                                                    <button 
                                                        className="edit-button" 
                                                        onClick={() => importFileAsDocument(file)}
                                                        style={{ 
                                                            padding: '0.4rem 0.8rem',
                                                            backgroundColor: isImported ? '#6c757d' : '#17a2b8',
                                                            borderColor: isImported ? '#6c757d' : '#17a2b8',
                                                            color: 'white',
                                                            opacity: isImported ? 0.6 : 1
                                                        }}
                                                        title={isImported ? "This file is already imported" : "Import this file as an editable documentation file"}
                                                    >
                                                        📥 {isImported ? 'Imported' : 'Import'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                
                                {currentFolderContent.folders.length === 0 && currentFolderContent.files.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                                            {showOnlyUndocumented ? 'No undocumented files in this folder' : 'This folder is empty'}
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* Invitation Manager Modal */}
            {showInvitationManager && (
                <InvitationManager
                    repoKey={repoKey}
                    repoName={repoInfo?.name || repoKey}
                    onClose={() => setShowInvitationManager(false)}
                />
            )}
        </div>
    );
}
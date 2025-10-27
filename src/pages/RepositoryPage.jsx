// src/pages/RepositoryPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import "../styles.css";

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function RepositoryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    // Try to get repoKey from multiple sources
    const { repoInfo, repoKey: stateRepoKey, projectId, token } = location.state || {};
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
    
    // To-do list state
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState('');
    const [showTodoForm, setShowTodoForm] = useState(false);
    
    // Edit description state
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState(repoInfo?.description || '');

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

    // Load files from GitHub
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

    // Build folder structure from files
    const folderStructure = useMemo(() => {
        const structure = {};
        
        files.forEach(file => {
            const pathParts = file.path.split('/');
            const fileName = pathParts[pathParts.length - 1];
            const folderPath = pathParts.slice(0, -1).join('/');
            
            if (!structure[folderPath]) {
                structure[folderPath] = [];
            }
            
            structure[folderPath].push({
                path: file.path,
                name: fileName,
                size: file.size ?? "-",
                lastEdited: file.lastEdited,
            });
        });
        
        return structure;
    }, [files]);

    // Get current folder's files and subfolders
    const currentFolderContent = useMemo(() => {
        const filesInFolder = folderStructure[currentFolder] || [];
        const subfolders = new Set();
        
        // Find immediate subfolders
        Object.keys(folderStructure).forEach(folderPath => {
            if (folderPath.startsWith(currentFolder)) {
                const relativePath = currentFolder ? folderPath.slice(currentFolder.length + 1) : folderPath;
                const firstPart = relativePath.split('/')[0];
                
                if (firstPart && relativePath.includes('/')) {
                    subfolders.add(firstPart);
                }
            }
        });
        
        return {
            files: filesInFolder,
            folders: Array.from(subfolders).sort()
        };
    }, [folderStructure, currentFolder]);

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
            branch: 'main'
        });
        
        // Only add path if one is provided
        if (filePath) {
            params.append('path', filePath);
        }

        const editorUrl = `/editor?${params.toString()}`;
        console.log("Navigating to:", editorUrl); // Debug log
        
        // Navigate with state so EditorPage can link back to repository
        navigate(editorUrl, { state: { repoKey, repoInfo } });
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
                        <h1 className="project-title">{repoInfo?.name || repoKey}</h1>
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
                                {currentFolderContent.files.map(file => (
                                    <tr key={file.path}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1em' }}>📄</span>
                                                {file.name}
                                            </div>
                                        </td>
                                        <td>{file.size}</td>
                                        <td>{since(file.lastEdited)}</td>
                                        <td>
                                            <button 
                                                className="edit-button" 
                                                onClick={() => {
                                                    // Set initial code file and open editor
                                                    const params = new URLSearchParams({
                                                        repoKey: repoKey,
                                                        branch: 'main',
                                                        codeFile: file.path
                                                    });
                                                    navigate(`/editor?${params.toString()}`, { 
                                                        state: { repoKey, repoInfo, initialCodeFile: file.path } 
                                                    });
                                                }}
                                                style={{ padding: '0.4rem 0.8rem' }}
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                
                                {currentFolderContent.folders.length === 0 && currentFolderContent.files.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                                            This folder is empty
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
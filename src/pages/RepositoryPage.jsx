import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import './RepositoryPage.css';
import axios from 'axios';

// This is what's displayed after you create project, shows the list of everything and allows you to edit
// before you add your project to the list of projects

function ProjectPage() {
    const location = useLocation();
    const { repoInfo: initialRepoInfo, files: initialFiles } = location.state || {};

    // fetches repo data from github on previous page

    const [repoInfo, setRepoInfo] = useState(initialRepoInfo || {
        name: 'Sample Project',
        description: 'Sample Description'
    });
    const [files, setFiles] = useState(initialFiles || []);
    const [isEditing, setIsEditing] = useState(false);

    // error if no data
    if (!repoInfo) {
        return (
            <div className="project-container">
                <p>No project data found. <Link to="/">Go back</Link></p>
            </div>
        );
    }
    // handles any changes made
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setRepoInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };
    // used for displaying last edited but not really needed honestly
    const getLastEditTime = (dateString) => {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    };
    // when save button is clicked, updates what the user changed
    const handleSave = async () => {
        const updatedFiles = files.map(file => ({
            ...file,
            lastEdited: new Date().toISOString()
        }));
        setFiles(updatedFiles);
        setIsEditing(false);
    };
    // displays the project information and allows changes
    return (
        <div className="project-container">
            <header className="project-header">
                <div className="header-top">
                    <Link to="/" className="back-button">← Back to Home</Link>
                </div>
                <div className="header-content">
                    {isEditing ? (
                        <>
                            <input
                                type="text"
                                name="name"
                                value={repoInfo.name}
                                onChange={handleInputChange}
                                className="edit-repo-input"
                            />
                            <textarea
                                name="description"
                                value={repoInfo.description}
                                onChange={handleInputChange}
                                className="edit-repo-description"
                                placeholder="Add project introduction"
                            />
                        </>
                    ) : (
                        <>
                            <h1 className="project-title">{repoInfo.name}</h1>
                            <p className="project-introduction">
                                {repoInfo.description || 'No introduction available'}
                            </p>
                        </>
                    )}
                </div>
            </header>

            <div className="project-content">
                <section className="files-section">
                <h2>Files</h2>
                    <div className="files-table-container">
                        <table className="files-table">
                            <thead>
                            <tr>
                                <th>File</th>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Time since last edit</th>
                            </tr>
                            </thead>
                            <tbody>
                            {files.map((file, index) => (
                                <tr key={index}>
                                    <td>{file.name}</td>
                                    <td>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={file.title || `Title ${index + 1}`}
                                                onChange={(e) => {
                                                    const updatedFiles = [...files];
                                                    updatedFiles[index].title = e.target.value;
                                                    setFiles(updatedFiles);
                                                }}
                                                className="edit-cell-input"
                                            />
                                        ) : (
                                            file.title || `Title ${index + 1}`
                                        )}
                                    </td>
                                    <td>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={file.description || `Sample description for ${file.name}`}
                                                onChange={(e) => {
                                                    const updatedFiles = [...files];
                                                    updatedFiles[index].description = e.target.value;
                                                    setFiles(updatedFiles);
                                                }}
                                                className="edit-cell-input"
                                            />
                                        ) : (
                                            file.description || `Sample description for ${file.name}`
                                        )}
                                    </td>
                                    <td>{getLastEditTime(file.lastEdited)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="edit-controls-section">
                    {isEditing ? (
                        <div className="edit-controls">
                            <button
                                onClick={handleSave}
                                className="save-button"
                            >
                                Done
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="edit-button"
                        >
                            Edit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProjectPage;
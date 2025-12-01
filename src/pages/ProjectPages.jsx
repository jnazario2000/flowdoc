// src/pages/ProjectPagesList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles.css';

function ProjectPagesList() {
    const [projectPages, setProjectPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjectPages = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/project-pages');
                if (response.data && Array.isArray(response.data)) {
                    setProjectPages(response.data);
                    setFilteredProjects(response.data);
                } else {
                    throw new Error('Invalid data format received');
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch projects');
            } finally {
                setLoading(false);
            }
        };
        fetchProjectPages();
    }, []);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        const filtered = projectPages.filter(p =>
            p.title?.toLowerCase().includes(lower) ||
            p.description?.toLowerCase().includes(lower)
        );
        setFilteredProjects(filtered);
    }, [searchTerm, projectPages]);

    if (loading) return <div className="loading">Loading projects...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (projectPages.length === 0) return <div>No projects found</div>;

    // helper to derive "owner/repo" from githubUrl
    const deriveRepoKey = (githubUrl) => {
        if (!githubUrl) return "";
        const m = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
        if (m) return `${m[1]}/${m[2].replace(/\.git$/, "")}`;
        return "";
    };

    return (
        <div className="project-list-container">
            <button
                className="back-button"
                onClick={() => navigate('/')}
                style={{marginBottom: "1rem"}}
            >
                ⬅ Back
            </button>
            <h2>Project Pages</h2>
            <input
                type="text"
                className="search-bar"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ul className="project-list">
                {filteredProjects.map(project => (
                    <li
                        key={project._id}
                        className="project-item"
                        style={{cursor: "pointer"}}
                        onClick={() => navigate('/repositorypage', {
                            state: {
                                repoInfo: {
                                    name: project.title,
                                    description: project.description,
                                    githubUrl: project.githubUrl,
                                },
                                repoKey: deriveRepoKey(project.githubUrl),
                                projectId: project._id,
                                token: project.token
                            }
                        })}
                    >
                        <h3>{project.title}</h3>
                        <p className="description">{project.description}</p>
                        <div className="meta">
                            <span>Created: {new Date(project.createdAt).toLocaleString()}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ProjectPagesList;

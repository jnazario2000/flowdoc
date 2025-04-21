import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ProjectList.css';

function ProjectPagesList() {
    const [projectPages, setProjectPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProjectPages = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/project-pages');
                if (response.data && Array.isArray(response.data)) {
                    setProjectPages(response.data);
                } else {
                    throw new Error('Invalid data format received');
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch projects');
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProjectPages();
    }, []);

    if (loading) return <div className="loading">Loading projects...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (projectPages.length === 0) return <div>No projects found</div>;

    return (
        <div className="project-list-container">
            <h2>Project Pages</h2>
            <ul className="project-list">
                {projectPages.map(project => (
                    <li key={project._id} className="project-item">
                        <Link to={`/repository`} state={{ repoInfo: project, files: project.files }}>
                            <h3>{project.title}</h3>
                            <p className="description">{project.description}</p>
                            <div className="meta">

                                <span>Owner: {project.ownerId?.toString() || 'Unknown'}</span>
                                <span>Created: {new Date(project.createdAt).toLocaleString()}</span>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ProjectPagesList;

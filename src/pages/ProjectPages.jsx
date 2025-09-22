import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ProjectPages.css';


// uses api/project-pages to fetch all saved projects to display.
function ProjectPagesList() {
    const [projectPages, setProjectPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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
                console.error('Fetch error:', err);
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

    return (
        <div className="project-list-container">
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
                    <li key={project._id} className="project-item">
                        <Link
                            to="/displayproject"
                            state={{githubUrl: project.githubUrl || "https://github.com/MadryLab/modeldiff"}}
                        >
                            <h3>{project.title}</h3>
                            <p className="description">{project.description}</p>
                            <div className="meta">
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

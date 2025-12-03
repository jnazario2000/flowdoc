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
                const response = await axios.get('/api/project-pages');
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

    // helper to derive "owner/repo" from githubUrl
    const deriveRepoKey = (githubUrl) => {
        if (!githubUrl) return "";
        const m = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
        if (m) return `${m[1]}/${m[2].replace(/\.git$/, "")}`;
        return "";
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg,rgb(122, 122, 122) 0%,rgb(0, 0, 0) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    background: 'rgba(129, 128, 128, 0.95)',
                    padding: '3rem 4rem',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solidrgb(134, 134, 134)',
                        borderTop: '4px solid rgb(2, 2, 2)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1.5rem'
                    }}></div>
                    <p style={{ fontSize: '1.1rem', color: '#000', fontWeight: '600' }}>
                        Loading projects...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg,rgb(126, 126, 126) 0%,rgb(0, 0, 0) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
            }}>
                <div style={{
                    background: 'rgba(134, 133, 133, 0.95)',
                    padding: '3rem 4rem',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    textAlign: 'center',
                    maxWidth: '500px'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
                    <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Error Loading Projects</h2>
                    <p style={{ color: '#666', marginBottom: '2rem' }}>{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: '#000000',
                            color: '#fff',
                            border: 'none',
                            padding: '0.75rem 2rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '1rem'
                        }}
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg,rgb(131, 130, 130) 0%,rgb(8, 8, 8) 100%)',
            padding: '2rem'
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                {/* Header Section */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '16px',
                    padding: '2.5rem',
                    marginBottom: '2rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'transparent',
                            border: '2px solid rgb(0, 0, 0)',
                            color: '#000',
                            padding: '0.6rem 1.5rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            marginBottom: '1.5rem',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#000';
                            e.target.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = '#000';
                        }}
                    >
                        ⬅ Back to Home
                    </button>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div>
                            <h1 style={{
                                fontSize: '2.5rem',
                                color: '#000',
                                marginBottom: '0.5rem',
                                fontWeight: 'bold'
                            }}>
                                Browse Projects
                            </h1>
                            <p style={{
                                fontSize: '1.1rem',
                                color: '#666',
                                margin: 0
                            }}>
                                Discover and explore {projectPages.length} documented {projectPages.length === 1 ? 'project' : 'projects'}
                            </p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search projects by name or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1.5rem',
                                fontSize: '1rem',
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                outline: 'none',
                                transition: 'border-color 0.3s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#000'}
                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: '#000',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.4rem 0.8rem',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '600'
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {searchTerm && (
                        <p style={{
                            marginTop: '1rem',
                            color: '#666',
                            fontSize: '0.95rem'
                        }}>
                            Found {filteredProjects.length} {filteredProjects.length === 1 ? 'result' : 'results'} for "{searchTerm}"
                        </p>
                    )}
                </div>

                {/* Projects Grid */}
                {filteredProjects.length === 0 ? (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
                        <h3 style={{ fontSize: '1.5rem', color: '#000', marginBottom: '0.5rem' }}>
                            No Projects Found
                        </h3>
                        <p style={{ color: '#666', fontSize: '1.1rem' }}>
                            {searchTerm ? `No projects match "${searchTerm}"` : 'No projects available yet'}
                        </p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    marginTop: '1.5rem',
                                    background: '#000',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '0.75rem 2rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '1rem'
                                }}
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {filteredProjects.map((project, index) => (
                            <div
                                key={project._id}
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
                                style={{
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '16px',
                                    padding: '2rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                    border: '2px solid transparent',
                                    animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.15)';
                                    e.currentTarget.style.borderColor = '#000';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    background: 'linear-gradient(135deg,rgb(121, 121, 121) 0%,rgb(7, 7, 7) 100%)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.5rem',
                                    marginBottom: '1.5rem',
                                    color: '#fff',
                                    fontWeight: 'bold'
                                }}>
                                    {project.title.charAt(0).toUpperCase()}
                                </div>

                                <h3 style={{
                                    fontSize: '1.5rem',
                                    color: '#333',
                                    marginBottom: '0.75rem',
                                    fontWeight: 'bold',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {project.title}
                                </h3>

                                <p style={{
                                    color: '#666',
                                    lineHeight: '1.6',
                                    marginBottom: '1.5rem',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    minHeight: '4.8em'
                                }}>
                                    {project.description || 'No description available'}
                                </p>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid #e0e0e0'
                                }}>
                                    <span style={{
                                        fontSize: '0.85rem',
                                        color: '#999',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        {new Date(project.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </span>
                                    <span style={{
                                        background: '#000',
                                        color: '#fff',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600'
                                    }}>
                                        View →
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add keyframe animation for fade-in effect */}
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default ProjectPagesList;

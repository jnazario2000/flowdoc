import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, isAuthenticated, logout } from '../utils/authUtils';
import '../styles.css';

function Homepage() {
    const [user, setUser] = useState(null);
    const [authenticated, setAuthenticated] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setAuthenticated(isAuthenticated());
        if (isAuthenticated()) {
            setUser(getCurrentUser());
        }
    }, []);

    const handleSignOut = () => {
        logout();
        setAuthenticated(false);
        setUser(null);
        navigate('/signin');
    };

    return (
        <div className="homepage">
            <nav>
                <div className="logo">FlowDoc</div>
                <div className="nav-links">
                    <a href="#">Features</a>
                    <Link to="/profile" className="profile-link">Profile</Link>
                    {authenticated ? (
                        <>
                            <span style={{ color: '#fff', fontSize: '0.95rem', marginRight: '1rem' }}>
                                Welcome, {user?.name || user?.username || 'User'}
                            </span>
                            <button 
                                onClick={handleSignOut}
                                style={{
                                    background: 'none',
                                    border: '1px solid #fff',
                                    color: '#fff',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#fff';
                                    e.target.style.color = '#000';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'none';
                                    e.target.style.color = '#fff';
                                }}
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <Link to="/signin">Sign In</Link>
                    )}
                </div>
            </nav>

            <header>
                <h1>Home Page</h1>
                <p>The all in one place to document code! Browse different projects with all kinds of languages and functions.</p>

                <Link to="/browseprojects" className="browse-projects-button">
                    Browse Projects
                </Link>

                <Link to="/Project" className="create-projects-button">
                    Create Projects
                </Link>
            </header>
        </div>
    );
}

export default Homepage;

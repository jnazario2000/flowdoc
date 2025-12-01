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
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,rgb(121, 115, 115) 0%,rgb(0, 0, 0) 100%)' }}>
            {/* Navigation */}
            <nav style={{
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    color: '#fff',
                    letterSpacing: '-0.5px'
                }}>
                    <span style={{ color: 'rgb(119, 0, 0)' }}>Flow</span>Doc
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <Link to="/profile" style={{
                        color: '#fff',
                        textDecoration: 'none',
                        fontSize: '1rem',
                        fontWeight: '500',
                        transition: 'opacity 0.3s',
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}>
                        Profile
                    </Link>
                    {authenticated ? (
                        <>
                            <span style={{ color: '#fff', fontSize: '0.95rem' }}>
                                Welcome, {user?.name || user?.username || 'User'}
                            </span>
                            <button 
                                onClick={handleSignOut}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: '2px solid #fff',
                                    color: '#fff',
                                    padding: '0.6rem 1.5rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#fff';
                                    e.target.style.color = '#000';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                                    e.target.style.color = '#fff';
                                }}
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                    <Link to="/signin" style={{
                        background: '#fff',
                        color: '#000',
                        padding: '0.6rem 1.5rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        transition: 'transform 0.3s, box-shadow 0.3s',
                        display: 'inline-block'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }}>
                        Sign In
                    </Link>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '4rem 2rem',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '3.5rem',
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: '1.5rem',
                    lineHeight: '1.2',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    Documenting, Made Easy<br />
                </h1>
                
                <p style={{
                    fontSize: '1.25rem',
                    color: 'rgba(250, 249, 249, 0.9)',
                    maxWidth: '700px',
                    margin: '0 auto 3rem',
                    lineHeight: '1.8'
                }}>
                    The all-in-one platform to create, organize, and share code documentation.
                    Link documentation directly to your code, collaborate with your team, and never lose track of your project's story.
                </p>

                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '5rem' }}>
                    <Link to="/browseprojects" style={{
                        background: '#fff',
                        color: '#000',
                        padding: '1rem 2.5rem',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        transition: 'all 0.3s ease',
                        display: 'inline-block',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                    }}>
                        🔍 Browse Projects
                    </Link>

                    <Link to="/Project" style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '2px solid #fff',
                        color: '#fff',
                        padding: '1rem 2.5rem',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        transition: 'all 0.3s ease',
                        display: 'inline-block',
                        backdropFilter: 'blur(10px)'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = '#fff';
                        e.target.style.color = '#000';
                        e.target.style.transform = 'translateY(-3px)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.color = '#fff';
                        e.target.style.transform = 'translateY(0)';
                    }}>
                        ✨ Create Project
                    </Link>
                </div>

                {/* Features Section */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '2rem',
                    marginTop: '4rem'
                }}>
                    {/* Feature Card 1 */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '2.5rem 2rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        transition: 'transform 0.3s, box-shadow 0.3s',
                        cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                            Smart Code Linking
                        </h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>
                            [PLACEHOLDER: Add description about linking documentation directly to specific lines of code, making it easy to navigate and understand your codebase]
                        </p>
                    </div>

                    {/* Feature Card 2 */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '2.5rem 2rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        transition: 'transform 0.3s, box-shadow 0.3s',
                        cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                            AI-Powered Documentation
                        </h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>
                            [PLACEHOLDER: Add description about AI automatically generating documentation from code, saving time and ensuring consistency]
                        </p>
                    </div>

                    {/* Feature Card 3 */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '2.5rem 2rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        transition: 'transform 0.3s, box-shadow 0.3s',
                        cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                            Team Collaboration
                        </h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>
                            [PLACEHOLDER: Add description about real-time collaboration, role-based permissions, and team features]
                        </p>
                    </div>

                    {/* Feature Card 4 */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '2.5rem 2rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        transition: 'transform 0.3s, box-shadow 0.3s',
                        cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                            Rich Text Editor
                        </h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>
                            [PLACEHOLDER: Add description about the powerful editor with formatting, images, lists, and more]
                        </p>
                    </div>

                    {/* Feature Card 5 */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '2.5rem 2rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        transition: 'transform 0.3s, box-shadow 0.3s',
                        cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                            Access Control
                        </h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>
                            [PLACEHOLDER: Add description about private repositories, role management, and security features]
                        </p>
                    </div>

                    {/* Feature Card 6 */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '2.5rem 2rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        transition: 'transform 0.3s, box-shadow 0.3s',
                        cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                            Fast & Intuitive
                        </h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>
                            [PLACEHOLDER: Add description about performance, ease of use, and modern interface]
                        </p>
                    </div>
                </div>
            </div>

            
        </div>
    );
}

export default Homepage;

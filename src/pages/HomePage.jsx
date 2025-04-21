import React from 'react';
import { Link } from 'react-router-dom';
import './Homepage.css';

function Homepage() {
    return (
        <div className="homepage">
            <nav>
                <div className="logo">FlowDoc</div>
                <div className="nav-links">
                    <a href="#">Features</a>
                    <Link to="/profile" className="profile-link">Profile</Link>
                    <Link to="/fltech">Sign In</Link>
                </div>
            </nav>

            <header>
                <h1>Home Page</h1>
                <p>The all in one place to document code! Browse different projects with all kinds of languages and functions.</p>

                <Link to="/pages" className="browse-projects-button">
                    Browse Projects
                </Link>

                <Link to="/Project" className="create-projects-button">
                    Create Projects
                </Link>
            </header>

            {/* You can uncomment the below sections if needed later */}
            {/*
            <section>
                <h2>Most Popular</h2>
                <div className="document-icons">
                    <div className="doc-icon">📄</div>
                    <div className="doc-icon">📄</div>
                    <div className="doc-icon">📄</div>
                </div>
            </section>

            <section>
                <h2>Top Collaborators This Month</h2>
                <div className="collaborators">
                    <div className="card">
                        <h3>Highest Average Code Coverage</h3>
                        <p>Sample_Collaborator3</p>
                        <small>Specializes in Web Applications</small>
                    </div>
                    <div className="card">
                        <h3>Most Hours Spent Documenting</h3>
                        <p>Sample_Collaborator2</p>
                        <small>Specializes in Python based projects</small>
                    </div>
                    <div className="card">
                        <h3>Highest Rated Collaborator</h3>
                        <p>Sample_Collaborator3</p>
                        <small>Specializes in JavaScript based projects</small>
                    </div>
                </div>
            </section>
            */}
        </div>
    );
}

export default Homepage;

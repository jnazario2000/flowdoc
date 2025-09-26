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

import { Link } from 'react-router-dom';

// client/src/pages/Homepage.jsx
import React from 'react';
import './Homepage.css'; //

function Homepage() {
    return (
        <div className="homepage">
            <nav>
                <div>FlowDoc</div>
                <div>
                    <a href="#">Features</a>
                    <Link to="/fltech">Sign In</Link>  {/*do /signup to change to other signup */}
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

            {/* We are not a public website anymore, so all of the features for standing out and differentiating ourselves are thrown away */}
            {/*<section>
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

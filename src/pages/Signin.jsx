// client/src/pages/Signin.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Signin.css';

function Signin() {
    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle sign-in logic here (will connect to backend later)
        console.log('Sign-in form submitted');
    };

    return (
        <div className="signin-page">
            <nav>
                <div className="logo">FlowDoc</div>
            </nav>

            <main>
                <section className="signin-section">
                    <h2>Sign In</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="email">Email address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="email@example.com"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                        <button type="submit">Sign In</button>
                    </form>
                    <p>
                        Don't have an account? <Link to="/signup">Sign up here</Link>.
                    </p>
                </section>
            </main>
        </div>
    );
}

export default Signin;
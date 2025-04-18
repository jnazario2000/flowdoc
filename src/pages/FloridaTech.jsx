import React from 'react';
import './FLTech.css';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const FloridaTech = () => {
    const [formData, setFormData] = React.useState({
        username: '',
        password: ''
    });
    const [error, setError] = React.useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors

        try {
            // Send login request to backend
            const response = await axios.post('http://localhost:3000/api/auth/login', {
                username: formData.username,
                password: formData.password
            });

            // If login successful (check your backend response structure)
            if (response.data && response.data.success) {
                // Store token in localStorage or context
                localStorage.setItem('authToken', response.data.token);

                // Redirect to homepage
                navigate('/');
            } else {
                setError('Invalid username or password');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        }
    };

    return (
        <div className="container">
            <h1 className="header">Login</h1>
            <h2 className="subheader">Enter your TRACKS Username and Password</h2>

            {/* Error message display */}
            {error && <div className="error-message" style={{color: 'red', margin: '10px 0'}}>{error}</div>}

            <form onSubmit={handleSubmit} className="form">
                <label htmlFor="username" className="label">TRACKS Username:</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    className="input"
                    value={formData.username}
                    onChange={handleChange}
                    required
                />
                <input
                    type="text"
                    className="hiddenInput"
                />

                <label htmlFor="password" className="label">TRACKS Password:</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    className="input"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <hr className="divider" />

                <button type="submit" className="loginButton">LOGIN</button>

                <div className="checkboxContainer">
                    <p className="sectionText">
                        Forgot your TRACKS password or need to reset it?
                    </p>
                </div>
            </form>

            <section className="section">
                <h3 className="sectionHeader">What is TRACKS?</h3>
                <p className="sectionText">
                    TRACKS is Florida Tech's user account system that provides a single username and password to access many University services granted to a user.
                </p>
            </section>

            <section className="section">
                <h3 className="sectionHeader">Password Help</h3>
                <p className="sectionText">
                    To reset your password, visit the <Link to="/reset" className="link">TRACKS Account Reset page</Link>.
                </p>
                <p className="sectionText">
                    If you have forgotten your TRACKS username or have other issues logging in to CAS, please contact Tech Support using the <Link to="/support" className="link">Technology Support Center Request System</Link>.
                </p>
            </section>

            <section className="section">
                <h3 className="sectionHeader">When Finished</h3>
                <p className="securityNote">
                    For added security, <strong>please log out and close your web browser</strong> when you are finished accessing services that require authentication.
                </p>
            </section>
        </div>
    );
};

export default FloridaTech;
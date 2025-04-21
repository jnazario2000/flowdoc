import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './FLTech.css';

function Signin() {
    const [formData, setFormData] = useState({
        identifier: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { identifier, password } = formData;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const testApiConnection = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:3001/users');
        } catch (err) {
            setApiStatus('failed');
            console.error('API connection test failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:3001/users', {
                identifier,
                password
            });

            localStorage.setItem('authToken', response.data.token);
            navigate('/');
        } catch (err) {
            setApiStatus('failed');
            setError(err.response?.data?.message || 'Login failed. Please try again.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">

            <h1 className="header">Sign In</h1>
            <h2 className="subheader">Enter your TRACKS credentials</h2>


            <form onSubmit={handleSubmit} className="form">
                <label htmlFor="identifier" className="label">Username or Email:</label>
                <input
                    type="text"
                    id="identifier"
                    name="identifier"
                    className="input"
                    value={identifier}
                    onChange={handleChange}
                    placeholder="username or email@example.com"
                    required
                    autoComplete="username"
                />

                <label htmlFor="password" className="label">Password:</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    className="input"
                    value={password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                />

                <hr className="divider" />

                <button
                    type="submit"
                    className="loginButton"
                    disabled={loading || !identifier || !password}
                >
                    {loading ? 'Signing In...' : 'SIGN IN'}
                </button>
            </form>

            <div className="test-credentials">
                <button onClick={() => {
                    setFormData({
                        identifier: 'test@example.com',
                        password: 'test123'
                    });
                }}>
                    Load Test Credentials
                </button>
            </div>

            <section className="section">
                <p className="sectionText">
                    Don't have an account? <Link to="/signup" className="link">Sign up here</Link>.
                </p>
            </section>

            <section className="section">
                <h3 className="sectionHeader">Need Help?</h3>
                <p className="sectionText">
                    Forgot your password? <Link to="/reset" className="link">Reset it here</Link>.
                </p>
                <p className="sectionText">
                    Contact <Link to="/support" className="link">Tech Support</Link> for login assistance.
                </p>
            </section>

            <section className="section">
                <h3 className="sectionHeader">Security Notice</h3>
                <p className="securityNote">
                    Always log out and close your browser when finished.
                </p>
            </section>
        </div>
    );
}

export default Signin;
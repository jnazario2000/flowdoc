import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Signin.css';

function Signin() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [apiStatus, setApiStatus] = useState('untested'); // 'untested', 'working', 'failed'
    const navigate = useNavigate();

    // Test API connection independently
    const testApiConnection = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:3001/users');
            setApiStatus(response.status === 200 ? 'working' : 'failed');
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
            setApiStatus('working'); // Confirm API worked
            navigate('/');
        } catch (err) {
            setApiStatus('failed');
            setError(err.response?.data?.message || 'Login failed. Please try again.');
            console.error('Login error:', {
                config: err.config,
                response: err.response
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signin-page">
            <nav>
                <div className="logo">FlowDoc</div>
                <button
                    onClick={testApiConnection}
                    className="api-test-button"
                    disabled={loading}
                >
                    Test API Connection
                </button>
            </nav>

            <main>
                <section className="signin-section">
                    <h2>Sign In</h2>

                    {/* API Status Indicator */}
                    <div className={`api-status ${apiStatus}`}>
                        API Status: {
                        apiStatus === 'working' ? '✅ Operational' :
                            apiStatus === 'failed' ? '❌ Not Working' :
                                '🔍 Untested'
                    }
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="identifier">Username or Email</label>
                            <input
                                type="text"
                                id="identifier"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="username or email@example.com"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="test-credentials">
                        <h4>Test API With:</h4>
                        <button onClick={() => {
                            setIdentifier('test@example.com');
                            setPassword('test123');
                        }}>
                            Load Test Credentials
                        </button>
                    </div>

                    <p>
                        Don't have an account? <Link to="/signup">Sign up here</Link>.
                    </p>
                </section>
            </main>
        </div>
    );
}

export default Signin;
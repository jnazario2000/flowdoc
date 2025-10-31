import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Signup() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        name: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const navigate = useNavigate();

  const { username, email, name, password, confirmPassword } = formData;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear errors when user starts typing
        if (error) setError('');
        
        // Validate username format as user types
        if (name === 'username') {
            if (value.length > 0 && value.length < 3) {
                setUsernameError('Username must be at least 3 characters');
            } else if (value.length > 20) {
                setUsernameError('Username must be less than 20 characters');
            } else if (!/^[a-zA-Z0-9_-]+$/.test(value) && value.length > 0) {
                setUsernameError('Username can only contain letters, numbers, hyphens, and underscores');
            } else {
                setUsernameError('');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setUsernameError('');

        // Validate username format
        if (username.length < 3) {
            setUsernameError('Username must be at least 3 characters');
            setLoading(false);
            return;
        }
        
        if (username.length > 20) {
            setUsernameError('Username must be less than 20 characters');
            setLoading(false);
            return;
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            setUsernameError('Username can only contain letters, numbers, hyphens, and underscores');
            setLoading(false);
            return;
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        // Validate password length
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, name, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific error messages
                if (data.message.includes('Username already taken')) {
                    setUsernameError(data.message);
                } else {
                    setError(data.message || 'Signup failed');
                }
                setLoading(false);
                return;
            }

            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Navigate to home page
            navigate('/');
        } catch (err) {
            setError(err.message || 'Signup failed. Please try again.');
            console.error('Signup error:', err);
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="container" style={{ maxWidth: '500px', margin: '2rem auto' }}>
      <h1 className="header">Create Account</h1>
      <h2 className="subheader">Sign up to start documenting your code</h2>

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          border: '1px solid #ef5350'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
                <label htmlFor="username" className="label">Username:</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    className="input"
                    value={username}
                    onChange={handleChange}
                    placeholder="Choose a unique username"
                    required
                    autoComplete="username"
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_-]+"
                    style={{
                        borderColor: usernameError ? '#dc3545' : undefined
                    }}
                />
                {usernameError && (
                    <div style={{
                        color: '#dc3545',
                        fontSize: '0.875rem',
                        marginTop: '0.25rem',
                        marginBottom: '0.5rem'
                    }}>
                        {usernameError}
                    </div>
                )}
                <p style={{ fontSize: '0.85em', color: '#666', margin: '0.25rem 0 1rem 0' }}>
                    3-20 characters, letters, numbers, hyphens, and underscores only
                </p>

        <label htmlFor="email" className="label">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          className="input"
          value={email}
          onChange={handleChange}
          placeholder="your.email@example.com"
          required
          autoComplete="email"
        />

        <label htmlFor="name" className="label">Full Name (optional):</label>
        <input
          type="text"
          id="name"
          name="name"
          className="input"
          value={name}
          onChange={handleChange}
          placeholder="John Doe"
          autoComplete="name"
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
          autoComplete="new-password"
          minLength={6}
        />
        <p style={{ fontSize: '0.85em', color: '#666', margin: '0.25rem 0 1rem 0' }}>
          Must be at least 6 characters
        </p>

        <label htmlFor="confirmPassword" className="label">Confirm Password:</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          className="input"
          value={confirmPassword}
          onChange={handleChange}
          placeholder="••••••••"
          required
          autoComplete="new-password"
          minLength={6}
        />

        <hr className="divider" />

        <button
          type="submit"
          className="loginButton"
          disabled={loading || !username || !email || !password || !confirmPassword}
          style={{
            opacity: loading || !username || !email || !password || !confirmPassword ? 0.6 : 1,
            cursor: loading || !username || !email || !password || !confirmPassword ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating Account...' : 'CREATE ACCOUNT'}
        </button>
      </form>

      <section className="section" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <p className="sectionText">
          Already have an account? <Link to="/signin" className="link">Sign in here</Link>.
        </p>
      </section>
    </div>
  );
}

export default Signup;


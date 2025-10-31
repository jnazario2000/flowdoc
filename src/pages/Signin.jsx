import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Sign in failed');
      }

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Navigate to home page
      navigate('/');
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '500px', margin: '2rem auto' }}>
      <h1 className="header">Sign In</h1>
      <h2 className="subheader">Welcome back to FlowDoc</h2>

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
          style={{
            opacity: loading || !identifier || !password ? 0.6 : 1,
            cursor: loading || !identifier || !password ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Signing In...' : 'SIGN IN'}
        </button>
      </form>

      <section className="section" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <p className="sectionText">
          Don't have an account? <Link to="/signup" className="link">Sign up here</Link>.
        </p>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <p className="sectionText" style={{ fontSize: '0.9em', color: '#666' }}>
          Having trouble? Contact support for assistance.
        </p>
      </section>
    </div>
  );
}

export default Signin;

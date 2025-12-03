// InvitationViewer Component
// Displays pending invitations for the user to accept or decline

import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/authUtils';

const API = import.meta.env.VITE_API_URL || '';

export default function InvitationViewer() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    loadInvitations(user);
  }, []);

  const loadInvitations = async (user) => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API}/api/invitations?userId=${user._id || user.id}&status=pending`);
      
      if (!res.ok) {
        throw new Error('Failed to load invitations');
      }

      const data = await res.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/api/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id || currentUser.id })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to accept invitation');
      }

      setSuccess('Invitation accepted! You now have access to the repository.');
      loadInvitations(currentUser);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDecline = async (invitationId) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/api/invitations/${invitationId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id || currentUser.id })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to decline invitation');
      }

      setSuccess('Invitation declined.');
      loadInvitations(currentUser);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
        Loading invitations...
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
        No pending invitations
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {invitations.map(invitation => (
          <div
            key={invitation._id}
            style={{
              padding: '1.5rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '2px solid #007bff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#007bff' }}>
                🔔 Collaboration Invitation
              </h4>
              <p style={{ margin: '0.5rem 0', fontSize: '1rem' }}>
                <strong>{invitation.fromUsername}</strong> has invited you to collaborate on:
              </p>
              <p style={{ margin: '0.5rem 0', fontSize: '1.1rem', fontWeight: 'bold' }}>
                📦 {invitation.repositoryName}
              </p>
              <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                Invited on {new Date(invitation.createdAt).toLocaleDateString()} at{' '}
                {new Date(invitation.createdAt).toLocaleTimeString()}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleAccept(invitation._id)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                ✓ Accept
              </button>
              <button
                onClick={() => handleDecline(invitation._id)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                ✗ Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


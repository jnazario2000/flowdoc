// InvitationManager Component
// Allows repository owners to invite collaborators

import React, { useState, useEffect } from 'react';
import { getCurrentUser, isAuthenticated } from '../utils/authUtils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function InvitationManager({ repoKey, repoName, onClose }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [repository, setRepository] = useState(null);
  const [sentInvitations, setSentInvitations] = useState([]);

  useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentUser();
      setCurrentUser(user);
      loadRepository(user);
      loadSentInvitations(user);
    }
  }, [repoKey]);

  const loadRepository = async (user) => {
    try {
      const res = await fetch(`${API}/api/repositories/${encodeURIComponent(repoKey)}?userId=${user._id || user.id}`);
      if (res.ok) {
        const data = await res.json();
        setRepository(data.repository);
      }
    } catch (err) {
      console.error('Error loading repository:', err);
    }
  };

  const loadSentInvitations = async (user) => {
    try {
      const res = await fetch(`${API}/api/invitations/sent?userId=${user._id || user.id}`);
      if (res.ok) {
        const data = await res.json();
        // Filter for this repository
        const repoInvitations = data.invitations.filter(inv => inv.repositoryKey === repoKey);
        setSentInvitations(repoInvitations);
      }
    } catch (err) {
      console.error('Error loading invitations:', err);
    }
  };

  const handleSendInvitation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/api/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryKey: repoKey,
          fromUserId: currentUser._id || currentUser.id,
          toUsername: username.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send invitation');
      }

      setSuccess(`Invitation sent to ${username}!`);
      setUsername('');
      loadSentInvitations(currentUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      const res = await fetch(`${API}/api/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id || currentUser.id })
      });

      if (res.ok) {
        loadSentInvitations(currentUser);
        setSuccess('Invitation cancelled');
      }
    } catch (err) {
      setError('Failed to cancel invitation');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) {
      return;
    }

    try {
      const res = await fetch(`${API}/api/repositories/${encodeURIComponent(repoKey)}/collaborators`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id || currentUser.id,
          collaboratorId
        })
      });

      if (res.ok) {
        loadRepository(currentUser);
        setSuccess('Collaborator removed');
      } else {
        throw new Error('Failed to remove collaborator');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Manage Access - {repoName || repoKey}</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.25rem',
            color: '#666'
          }}>×</button>
        </div>

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

        {/* Send Invitation Form */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ marginTop: 0 }}>Invite Collaborator</h3>
          <form onSubmit={handleSendInvitation}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ddd',
                marginBottom: '1rem'
              }}
              required
            />
            <button
              type="submit"
              disabled={loading || !username.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading || !username.trim() ? 0.6 : 1
              }}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>
        </div>

        {/* Current Collaborators */}
        {repository && repository.collaborators && repository.collaborators.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3>Current Collaborators ({repository.collaborators.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {repository.collaborators.map(collab => (
                <div key={collab.userId} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px'
                }}>
                  <div>
                    <strong>{collab.username}</strong>
                    <br />
                    <small style={{ color: '#666' }}>
                      Added {new Date(collab.addedAt).toLocaleDateString()}
                    </small>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.userId)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {sentInvitations.filter(inv => inv.status === 'pending').length > 0 && (
          <div>
            <h3>Pending Invitations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sentInvitations.filter(inv => inv.status === 'pending').map(inv => (
                <div key={inv._id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: '#fff3cd',
                  borderRadius: '4px'
                }}>
                  <div>
                    <strong>{inv.toUsername}</strong>
                    <br />
                    <small style={{ color: '#666' }}>
                      Invited {new Date(inv.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <button
                    onClick={() => handleCancelInvitation(inv._id)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


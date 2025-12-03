import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getCurrentUser, getCurrentUserId, isAuthenticated, logout, updateCurrentUser } from "../utils/authUtils";
import { useNavigate } from "react-router-dom";
import InvitationViewer from "../components/InvitationViewer";
import "../styles.css";

/**
 * Profile page - shows current authenticated user
 * - Shows real user profile from authentication
 * - Edit Profile modal edits name, email, projectName, projectDescription, githubUrl.
 * - View Edit History shows actual edit history from the database
 */

const API_BASE =
  (import.meta?.env && import.meta.env.VITE_API_BASE_URL) || "";

export default function Profile() {
  const navigate = useNavigate();

  // ---------- USER ----------
  const [user, setUser] = useState(() => getCurrentUser());
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      // Redirect to signin if not authenticated
      navigate('/signin');
      return;
    }

    // Get current user from localStorage
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, [navigate]);

  const userId = useMemo(() => getCurrentUserId(), []);

  // Header display data with safe fallbacks
  const displayName = user?.name || "Guest";
  const displayBio =
    user?.bio ||
    (user?.projectName
      ? `${user.projectName}${user.projectDescription ? " — " + user.projectDescription : ""}`
      : "Add a short bio to your profile.");

  const avatarSrc =
    user?.avatarUrl?.trim()
      ? user.avatarUrl
      : "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName || "U");

  // ---------- EDIT PROFILE MODAL ----------
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    projectName: "",
    projectDescription: "",
  });

  useEffect(() => {
    if (editOpen) {
      setForm({
        name: user?.name || "",
        email: user?.email || "",
        projectName: user?.projectName || "",
        projectDescription: user?.projectDescription || "",
      });
      setSaveError("");
    }
  }, [editOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setSaveError("Name is required.");
      return;
    }

    const payload = {
      ...user,
      name: form.name.trim(),
      email: form.email.trim(),
      projectName: form.projectName.trim(),
      projectDescription: form.projectDescription.trim(),
    };

    setSaving(true);
    setSaveError("");

    try {
      let saved = payload;

      if (userId) {
        const { data } = await axios.put(`${API_BASE}/api/users/${userId}`, payload, {
          withCredentials: true,
        });
        saved = data;
      } else {
        // No backend user yet → save locally so page works
        saved = {
          _id: user?._id || "",
          ...payload,
        };
      }

      setUser(saved);
      updateCurrentUser(saved);  // Use correct localStorage key
      setEditOpen(false);
    } catch (err) {
      console.error("Failed to save profile", err);
      const status = err?.response?.status;
      setSaveError(`Failed to save profile${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setSaving(false);
    }
  };

  // ---------- EDIT HISTORY ----------
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyUserId, setHistoryUserId] = useState(userId || "");

  // ---------- INVITATIONS ----------
  const [invitationsOpen, setInvitationsOpen] = useState(false);

  useEffect(() => {
    // sync if user later loads
    if (userId && !historyUserId) setHistoryUserId(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const userIdToUse = userId || historyUserId.trim();
      if (!userIdToUse) {
        setHistoryError("No user ID available.");
        setHistoryLoading(false);
        return;
      }
      
      const { data } = await axios.get(
        `${API_BASE}/api/editHistories/user/${userIdToUse}`,
        { withCredentials: true }
      );
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) setHistory([]);
      else {
        console.error("History load failed", e);
        setHistoryError(`Failed to load edit history${status ? ` (HTTP ${status})` : ""}.`);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const open = !historyOpen;
    setHistoryOpen(open);
    if (open && history.length === 0) loadHistory();
  };

  // ---------- RENDER ----------
  if (userLoading) {
    return (
      <main className="profile-page">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="profile-page">
      {/* Back to Home Button */}
      <div style={{ marginBottom: '1rem' }}>
        <a href="/" style={{ 
          display: 'inline-block',
          padding: '0.5rem 1rem',
          backgroundColor: '#6c757d',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '0.9em'
        }}>
          ← Back to Home
        </a>
      </div>

      {/* Header card */}
      <section className="profile" data-testid="profile">
        <img className="profile__avatar" src={avatarSrc} alt={`${displayName}'s avatar`} />
        <div className="profile__meta">
          <h1 className="profile__name">{displayName}</h1>
          <p className="profile__bio">{displayBio}</p>
          <div className="profile__actions">
            <button className="btn btn--primary" onClick={() => setEditOpen(true)}>
              Edit Profile
            </button>
            <button className="btn btn--secondary" onClick={toggleHistory}>
              {historyOpen ? "Hide Edit History" : "View Edit History"}
            </button>
            <button 
              className="btn btn--secondary" 
              onClick={() => setInvitationsOpen(!invitationsOpen)}
              style={{
                backgroundColor: invitationsOpen ? '#6c757d' : '#007bff',
                borderColor: invitationsOpen ? '#6c757d' : '#007bff',
                color: 'white'
              }}
            >
              {invitationsOpen ? "Hide Invitations" : "View Invitations"}
            </button>
            <button 
              className="btn btn--danger" 
              onClick={() => {
                logout();
                navigate('/signin');
              }}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* History panel */}
      {historyOpen && (
        <section className="history">
          <h2>My Edit History</h2>
          <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '1rem' }}>
            Showing all document edits for <strong>{user?.name || 'Test User'}</strong>
          </p>

          {historyError && <p className="error">{historyError}</p>}
          {!historyError && historyLoading && <p>Loading edit history…</p>}
          {!historyError && !historyLoading && history.length === 0 && (
            <div style={{ 
              padding: '2rem', 
              textAlign: 'center', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '4px',
              border: '1px dashed #ccc' 
            }}>
              <p style={{ margin: 0 }}>
                No edit history yet. Start editing documents to see your history here!
              </p>
            </div>
          )}
          {!historyError && !historyLoading && history.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9em', opacity: 0.8 }}>
                Total edits: <strong>{history.length}</strong>
              </p>
              <ul className="history__list" style={{ 
                maxHeight: '600px', 
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '0'
              }}>
                {history.map((h, index) => {
                  const ts = h.timestamp || h.createdAt || null;
                  const changesText = typeof h.changes === "string" ? h.changes : JSON.stringify(h.changes);
                  const fileName = h.path ? h.path.split('/').pop() : 'Unknown file';
                  
                  return (
                    <li key={h._id || index} className="history__item" style={{
                      padding: '1rem',
                      borderBottom: index < history.length - 1 ? '1px solid #eee' : 'none',
                      listStyle: 'none'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: '0.25rem' }}>
                            <strong style={{ fontSize: '1.1em' }}>📝 {fileName}</strong>
                          </div>
                          <div style={{ fontSize: '0.85em', color: '#666' }}>
                            <strong>Repository:</strong> {h.repoKey || '—'}
                          </div>
                          <div style={{ fontSize: '0.85em', color: '#666' }}>
                            <strong>Path:</strong> {h.path || '—'}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#666', textAlign: 'right' }}>
                          {ts ? new Date(ts).toLocaleString() : "—"}
                        </div>
                      </div>
                      <div style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        marginTop: '0.5rem'
                      }}>
                        <strong>Action:</strong> {h.action || 'edit'} - {changesText}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Invitations panel */}
      {invitationsOpen && (
        <section className="history" style={{ marginTop: '2rem' }}>
          <h2>📨 Collaboration Invitations</h2>
          <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '1rem' }}>
            Manage invitations to collaborate on private repositories
          </p>
          <InvitationViewer />
        </section>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Edit Profile">
          <div className="modal__card">
            <h3>Edit Profile</h3>
            <form className="form" onSubmit={handleSave}>
              <label className="form__row">
                <span>Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </label>

              <label className="form__row">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>

              <label className="form__row">
                <span>Project Name</span>
                <input
                  value={form.projectName}
                  onChange={(e) => setForm((p) => ({ ...p, projectName: e.target.value }))}
                />
              </label>

              <label className="form__row">
                <span>Project Description</span>
                <textarea
                  rows={3}
                  value={form.projectDescription}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, projectDescription: e.target.value }))
                  }
                />
              </label>

              {saveError && <p className="error">{saveError}</p>}

              <div className="modal__actions">
                <button type="button" className="btn" onClick={() => setEditOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button className="btn btn--primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

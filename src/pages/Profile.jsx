import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./profile.css";

/**
 * Profile page (no hard auth gate)
 * - Always renders Profile header + buttons.
 * - Loads user from /api/auth/me (if available) or localStorage("flowdoc_user").
 * - Edit Profile modal edits name, email, projectName, projectDescription, githubUrl.
 *   - If userId exists -> PUT /api/users/:id
 *   - Else -> save locally (localStorage) so page still works.
 * - View Edit History toggles a panel; if no userId, lets you enter one to fetch.
 */

const API_BASE =
  (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:3000";

export default function Profile() {
  // ---------- USER ----------
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Try session-backed current user
        const { data } = await axios.get(`${API_BASE}/api/auth/me`, {
          withCredentials: true,
        });
        if (!cancelled) {
          setUser(data);
          localStorage.setItem("flowdoc_user", JSON.stringify(data));
        }
      } catch {
        // Fallback to local cache (guest/local profile)
        const raw = localStorage.getItem("flowdoc_user");
        if (!cancelled) setUser(raw ? JSON.parse(raw) : null);
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const userId = useMemo(() => user?._id || user?.id || "", [user]);

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
    githubUrl: "",
  });

  useEffect(() => {
    if (editOpen) {
      setForm({
        name: user?.name || "",
        email: user?.email || "",
        projectName: user?.projectName || "",
        projectDescription: user?.projectDescription || "",
        githubUrl: user?.githubUrl || "",
      });
      setSaveError("");
    }
  }, [editOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const isValidGitHubUrl = (s) => {
    if (!s) return true; // optional
    try {
      const u = new URL(s);
      return u.hostname === "github.com";
    } catch {
      return false;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setSaveError("Name is required.");
      return;
    }
    if (!isValidGitHubUrl(form.githubUrl)) {
      setSaveError("GitHub URL must be a valid github.com link.");
      return;
    }

    const payload = {
      ...user,
      name: form.name.trim(),
      email: form.email.trim(),
      projectName: form.projectName.trim(),
      projectDescription: form.projectDescription.trim(),
      githubUrl: form.githubUrl.trim(),
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
      localStorage.setItem("flowdoc_user", JSON.stringify(saved));
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

  useEffect(() => {
    // sync if user later loads
    if (userId && !historyUserId) setHistoryUserId(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadHistory = async () => {
    if (!historyUserId.trim()) {
      setHistoryError("Enter a User ID to view history.");
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const { data } = await axios.get(
        `${API_BASE}/api/editHistories/user/${historyUserId.trim()}`,
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
          </div>
        </div>
      </section>

      {/* History panel */}
      {historyOpen && (
        <section className="history">
          <h2>User Edit History</h2>

          {!userId && (
            <div className="history__controls">
              <input
                className="input"
                placeholder="Enter User ID to load history"
                value={historyUserId}
                onChange={(e) => setHistoryUserId(e.target.value)}
              />
              <button className="btn" onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? "Loading…" : "Load"}
              </button>
            </div>
          )}

          {historyError && <p className="error">{historyError}</p>}
          {!historyError && historyLoading && <p>Loading…</p>}
          {!historyError && !historyLoading && history.length === 0 && (
            <p>No edit history found.</p>
          )}
          {!historyError && !historyLoading && history.length > 0 && (
            <ul className="history__list">
              {history.map((h) => {
                const ts = h.timestamp || h.createdAt || null;
                const changesText =
                  typeof h.changes === "string" ? h.changes : JSON.stringify(h.changes);
                return (
                  <li key={h._id} className="history__item">
                    <div><strong>Document:</strong> {String(h.documentId ?? "—")}</div>
                    <div><strong>Changes:</strong> {changesText}</div>
                    <div><strong>Timestamp:</strong> {ts ? new Date(ts).toLocaleString() : "—"}</div>
                  </li>
                );
              })}
            </ul>
          )}
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

              <label className="form__row">
                <span>GitHub URL</span>
                <input
                  type="url"
                  placeholder="https://github.com/owner/repo"
                  value={form.githubUrl}
                  onChange={(e) => setForm((p) => ({ ...p, githubUrl: e.target.value }))}
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

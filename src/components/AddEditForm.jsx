import React, { useState } from "react";
import axios from "axios";
import "../styles.css";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const isObjectId = (s) => /^[a-fA-F0-9]{24}$/.test(s || "");

export default function AddEditForm() {
  const [formData, setFormData] = useState({ userId: "", documentId: "", changes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMsg({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isObjectId(formData.userId) || !isObjectId(formData.documentId)) {
      setMsg({ type: "error", text: "User ID and Document ID must be 24-char hex ObjectIds." });
      return;
    }

    // If "changes" is JSON, send object; else send raw string.
    let payload = { ...formData };
    try {
      const maybeJson = JSON.parse(formData.changes);
      if (maybeJson && typeof maybeJson === "object") payload.changes = maybeJson;
    } catch {
      // keep as string
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/editHistories`, payload);
      setMsg({ type: "success", text: "Edit history submitted!" });
      setFormData({ userId: "", documentId: "", changes: "" });
    } catch (error) {
      console.error("Error submitting edit history:", error);
      const status = error?.response?.status;
      setMsg({ type: "error", text: `Failed to submit${status ? ` (HTTP ${status})` : ""}.` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="add-edit-form" onSubmit={handleSubmit}>
      <h3>Submit Edit</h3>

      <label className="form-row">
        <span>User ID</span>
        <input
          name="userId"
          value={formData.userId}
          onChange={handleChange}
          placeholder="6805a3fbebffbc873b263f3a"
          required
        />
      </label>

      <label className="form-row">
        <span>Document ID</span>
        <input
          name="documentId"
          value={formData.documentId}
          onChange={handleChange}
          placeholder="64f0a2c5e9e9b2d3c4a5f6b7"
          required
        />
      </label>

      <label className="form-row">
        <span>Changes (JSON or text)</span>
        <textarea
          name="changes"
          value={formData.changes}
          onChange={handleChange}
          placeholder='e.g. {"title":"Fix typos"}  or  "Fixed typos in README"'
          rows={4}
          required
        />
      </label>

      {msg.text && (
        <p className={msg.type === "error" ? "msg msg--error" : "msg msg--success"}>{msg.text}</p>
      )}

      <button className="btn btn--primary" type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

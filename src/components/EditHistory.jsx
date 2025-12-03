import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles.css";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";

export default function EditHistory() {
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/editHistories`, {
          signal: controller.signal,
        });
        setHistories(Array.isArray(data) ? data : []);
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404) setHistories([]);
        else {
          console.error("Failed to load edit history:", e);
          setError(`Failed to load edit history${status ? ` (HTTP ${status})` : ""}.`);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error)   return <p className="eh-error">{error}</p>;

  if (histories.length === 0) return <p>No edit history yet.</p>;

  return (
    <div className="eh">
      <h3>Edit History</h3>
      <ul className="eh__list">
        {histories.map((edit) => {
          const ts = edit.timestamp || edit.createdAt || null;
          const changesText =
            typeof edit.changes === "string" ? edit.changes : JSON.stringify(edit.changes);
          return (
            <li key={edit._id} className="eh__item">
              <div><strong>User:</strong> {String(edit.userId ?? "—")}</div>
              <div><strong>Document:</strong> {String(edit.documentId ?? "—")}</div>
              <div><strong>Change:</strong> {changesText}</div>
              <div><strong>Time:</strong> {ts ? new Date(ts).toLocaleString() : "—"}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

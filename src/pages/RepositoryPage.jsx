// src/pages/RepositoryPage.jsx
import React, { useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./RepositoryPage.css";

export default function RepositoryPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // repoInfo and files should be passed from your Create Project page via navigate(..., { state })
  const repoInfo = location.state?.repoInfo || { name: "Project", description: "", githubUrl: "" };
  const explicitKey = location.state?.repoKey;          // optional precomputed owner/repo
  const rawFiles = Array.isArray(location.state?.files) ? location.state.files : [];

  // --- helpers ---------------------------------------------------------------

  // Clean GitHub UI prefixes (blob/main, tree/main) or absolute URLs → repo-relative path
  function stripGitHubBlob(p) {
    if (!p) return p;
    const m = p.match(/github\.com\/[^/]+\/[^/]+\/(?:blob|tree)\/[^/]+\/(.+)/i);
    if (m) return m[1];
    return p
      .replace(/^blob\/[^/]+\/+/, "")
      .replace(/^tree\/[^/]+\/+/, "")
      .replace(/^\/+/, "");
  }

  // Build owner/repo from either an explicit key, the GitHub URL, or (last resort) repoInfo owner/name
  function deriveRepoKey(repoInfo, explicitKey) {
    // prefer explicit owner/repo if already correct
    if (explicitKey && explicitKey.includes("/")) return explicitKey;

    // parse from GitHub URL if present
    const gh = repoInfo?.githubUrl || explicitKey || "";
    const m = gh.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (m) return `${m[1]}/${m[2].replace(/\.git$/, "")}`;

    // last resort: separate owner + name provided in state
    if (repoInfo?.owner && repoInfo?.name) return `${repoInfo.owner}/${repoInfo.name}`;

    // WARNING: returning only repo name will break lookups; avoid this.
    return explicitKey || "";
  }

  // Normalize your incoming file list to a simple shape
  const files = useMemo(() => {
    return rawFiles
      .map((f) => ({
        path: stripGitHubBlob(f.path || f.name || ""),
        name: f.name || f.path || "",
        lang: f.lang || "",
        size: f.size ?? "",
        lastEdited: f.lastEdited || null,
      }))
      .filter((f) => f.path);
  }, [rawFiles]);

  // Navigate to editor with proper owner/repo and clean path
  function openEditor(filePathRaw) {
    let repoKey = deriveRepoKey(repoInfo, explicitKey); // must be owner/repo (e.g., "hashiim0206/DigitalTwin")
    let filePath = stripGitHubBlob(filePathRaw || "");

    if (!repoKey || !repoKey.includes("/")) {
      alert("Missing owner/repo. Ensure repoKey is like 'hashiim0206/DigitalTwin'.");
      return;
    }

    // If someone passed only owner as repoKey AND your importer stored "repo/<path>", the backend normalizer will handle it.
    navigate(
      `/editor?repoKey=${encodeURIComponent(repoKey)}&path=${encodeURIComponent(filePath)}`
    );
  }

  // Pretty “time since” for Last Edited column
  function since(dateString) {
    if (!dateString) return "Just now";
    const d = new Date(dateString);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    return days <= 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} ago`;
  }

  // --- UI --------------------------------------------------------------------

  return (
    <div className="project-container">
      <header className="project-header">
        <div className="header-top">
          <Link to="/" className="back-button">← Back to Home</Link>
        </div>
        <div className="header-content">
          <h1 className="project-title">{repoInfo.name || "Repository"}</h1>
          <p className="project-introduction">
            {repoInfo.description || "No introduction available"}
          </p>
          <div className="text-sm opacity-70">
            Repo key guess:{" "}
            <code>{deriveRepoKey(repoInfo, explicitKey) || "(unknown)"}</code>
            {repoInfo.githubUrl ? (
              <>
                {" "}• Source:{" "}
                <a href={repoInfo.githubUrl} target="_blank" rel="noreferrer">
                  {repoInfo.githubUrl}
                </a>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="project-content">
        <section className="files-section">
          <h2>Files</h2>
          {files.length === 0 ? (
            <div className="empty">No files found.</div>
          ) : (
            <div className="files-table-container">
              <table className="files-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Language</th>
                    <th>Size</th>
                    <th>Last Edited</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.path}>
                      <td>{file.path}</td>
                      <td>{file.lang || "-"}</td>
                      <td>{file.size === "" ? "-" : file.size}</td>
                      <td>{since(file.lastEdited)}</td>
                      <td>
                        <button
                          className="edit-button"
                          onClick={() => openEditor(file.path)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Purpose: Return file content. Tries DB first (fast), then GitHub (raw API, then Contents API) as fallback.

import { state } from "../models/db.js";

// Normalize common GitHub path formats into a clean repo-relative path.
const normalizePath = (p) =>
  (p || "")
    .replace(/^blob\/[^/]+\/+/, "") // remove "blob/<branch>/"
    .replace(/^tree\/[^/]+\/+/, "") // remove "tree/<branch>/"
    .replace(/^\/+/, "");           // remove leading "/"

// Escape regex meta characters for safe dynamic regex building.
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Try raw.githubusercontent.com first (fastest path for plain files)
async function fetchGitHubRaw(owner, repo, branch, path, token) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const resp = await fetch(url, { headers }).catch((e) => ({ ok: false, _err: e.message }));
  if (!resp || !resp.ok) return { ok: false, url, status: resp?.status, err: resp?._err };
  const text = await resp.text();
  return { ok: true, url, text };
}

// Fallback to GitHub Contents API (responds with base64-encoded content)
async function fetchGitHubContents(owner, repo, path, token, ref) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${
    ref ? `?ref=${encodeURIComponent(ref)}` : ""
  }`;
  const headers = {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const resp = await fetch(url, { headers }).catch((e) => ({ ok: false, _err: e.message }));
  if (!resp || !resp.ok) return { ok: false, url, status: resp?.status, err: resp?._err };

  const json = await resp.json();
  if (json && json.content && json.encoding === "base64") {
    const text = Buffer.from(json.content, "base64").toString("utf8");
    return { ok: true, url, text };
  }
  return { ok: false, url, status: resp.status, err: "no base64 content" };
}

// Load file content using DB first, then GitHub fallbacks. Includes a "debug" trace to help client-side troubleshooting.
export async function getFile(req, res) {
  const debug = { input: { ...req.query }, steps: [] };

  try {
    let { repoKey, path, branch, token: userToken } = req.query;
    console.log("[/api/files] query:", req.query);

    if (!repoKey || !path) {
      return res.status(400).json({ error: "repoKey and path are required", debug });
    }

    path = normalizePath(path);
    branch = branch || "main";
    debug.norm = { repoKey, path, branch };

    // 1) Exact DB hit (fast path)
    const exact = await state.files?.findOne?.({ repoKey, path });
    debug.steps.push({ type: "db-exact", hit: !!exact });
    if (exact?.content) {
      return res.json({ content: exact.content, repoKey, path, source: "db-exact", debug });
    }

    // 2) Suffix match in DB (handles stored paths with prefixes)
    const rx = new RegExp(`${reEscape(path)}$`);
    const suffixHits =
      (await state.files
        ?.find?.({ repoKey, path: rx })
        ?.project({ path: 1, content: 1 })
        ?.limit(3)
        ?.toArray?.()) || [];

    debug.steps.push({
      type: "db-suffix",
      count: suffixHits.length,
      hits: suffixHits.map((h) => h.path),
    });

    if (suffixHits.length === 1 && suffixHits[0]?.content) {
      return res.json({
        content: suffixHits[0].content,
        repoKey,
        path: suffixHits[0].path,
        source: "db-suffix",
        debug,
      });
    }

    if (suffixHits.length > 1) {
      // Multiple candidates? Let the client pick.
      return res.status(409).json({
        error: "multiple candidates",
        candidates: suffixHits.map((h) => h.path),
        repoKey,
        requested: path,
        debug,
      });
    }

    // 3) GitHub fallbacks (raw then contents; try main then master)
    const [owner, repo] = String(repoKey).split("/", 2);
    // Use user-provided token if available, otherwise fall back to server token
    const token = userToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

    if (owner && repo) {
      // raw/main
      const r1 = await fetchGitHubRaw(owner, repo, branch, path, token);
      debug.steps.push({ type: "github-raw", branch, ok: r1.ok, status: r1.status, url: r1.url, err: r1.err });
      if (r1.ok) return res.json({ content: r1.text, repoKey, path, source: "github-raw", branch, debug });

      // raw/master (legacy)
      if (branch !== "master") {
        const r2 = await fetchGitHubRaw(owner, repo, "master", path, token);
        debug.steps.push({ type: "github-raw", branch: "master", ok: r2.ok, status: r2.status, url: r2.url, err: r2.err });
        if (r2.ok) return res.json({ content: r2.text, repoKey, path, source: "github-raw", branch: "master", debug });
      }

      // contents/main
      const c1 = await fetchGitHubContents(owner, repo, path, token, branch);
      debug.steps.push({ type: "github-contents", branch, ok: c1.ok, status: c1.status, url: c1.url, err: c1.err });
      if (c1.ok) return res.json({ content: c1.text, repoKey, path, source: "github-contents", branch, debug });

      // contents/master
      if (branch !== "master") {
        const c2 = await fetchGitHubContents(owner, repo, path, token, "master");
        debug.steps.push({
          type: "github-contents",
          branch: "master",
          ok: c2.ok,
          status: c2.status,
          url: c2.url,
          err: c2.err,
        });
        if (c2.ok) return res.json({ content: c2.text, repoKey, path, source: "github-contents", branch: "master", debug });
      }
    } else {
      debug.steps.push({ type: "parse-repoKey", err: "invalid owner/repo" });
    }

    // Nothing worked
    return res.status(404).json({ error: "file not found", repoKey, requestedPath: path, branch, debug });
  } catch (err) {
    debug.steps.push({ type: "exception", err: String(err) });
    console.error("getFile error:", err);
    return res.status(500).json({ error: "internal error", debug });
  }
}

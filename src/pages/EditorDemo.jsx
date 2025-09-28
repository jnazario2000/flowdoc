import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./EditorDemo.css";

/** small helper */
function qs(obj) {
  return new URLSearchParams(obj).toString();
}

export default function EditorDemo() {
  const [params] = useSearchParams();
  const repoKey = params.get("repoKey") || "";
  const rawPath = params.get("path") || "";
  const branch = params.get("branch") || "main";

  const [docText, setDocText] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [links, setLinks] = useState([]);
  const [pickStart, setPickStart] = useState(null);
  const [pickEnd, setPickEnd] = useState(null);

  // fetch code file
  useEffect(() => {
    if (!repoKey || !rawPath) return;
    setLoading(true);
    setLoadErr("");
    setSaveMsg("");

    fetch(`/api/files?${qs({ repoKey, path: rawPath, branch })}`)
      .then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(j)))
      .then(j => {
        setCode(j.content || "");
      })
      .catch(err => {
        const msg = err?.error || "Failed to fetch code";
        setLoadErr(msg);
      })
      .finally(() => setLoading(false));
  }, [repoKey, rawPath, branch]);

  // fetch existing anchors for this file (if you wired list endpoint)
  useEffect(() => {
    if (!repoKey || !rawPath) return;
    fetch(`/api/anchors?${qs({ repoKey, path: rawPath })}`)
      .then(r => (r.ok ? r.json() : []))
      .then(j => {
        if (Array.isArray(j)) setLinks(j);
      })
      .catch(() => {});
  }, [repoKey, rawPath]);

  const codeLines = useMemo(() => (code ? code.split(/\r?\n/) : []), [code]);

  function clickLine(n) {
    if (pickStart == null) {
      setPickStart(n);
      setPickEnd(null);
    } else if (pickEnd == null) {
      setPickEnd(n);
    } else {
      setPickStart(n);
      setPickEnd(null);
    }
    setSaveMsg("");
    setSaveErr("");
  }

  function selectedRange() {
    if (pickStart == null || pickEnd == null) return null;
    const s = Math.min(pickStart, pickEnd);
    const e = Math.max(pickStart, pickEnd);
    return { startLine: s, endLine: e };
  }

  async function linkToCode() {
    setSaveMsg("");
    setSaveErr("");

    if (!repoKey || !rawPath) {
      setSaveErr("Missing repoKey/path.");
      return;
    }
    const range = selectedRange();
    if (!range) {
      setSaveErr("Pick a start line, then an end line.");
      return;
    }
    const payload = {
      repoKey,
      path: rawPath,
      branch,
      startLine: range.startLine,
      endLine: range.endLine,
      text: docText?.trim() || "",
    };

    try {
      const r = await fetch("/api/anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      setSaveMsg("Saved!");
      // re-pull anchors
      fetch(`/api/anchors?${qs({ repoKey, path: rawPath })}`)
        .then(x => (x.ok ? x.json() : []))
        .then(j => Array.isArray(j) && setLinks(j));
    } catch (err) {
      setSaveErr(err.message || "Save failed");
    }
  }

  return (
    <div className="editor-shell">
      <h1 className="editor-h1">
        {repoKey}/{rawPath}
      </h1>
      <div className="editor-sub">
        {loading ? "Loading code…" : loadErr ? `Load failed: ${loadErr}` : "All changes saved"}
      </div>

      {/* SPLIT LAYOUT */}
      <div className="editor-split">
        {/* LEFT: documentation editor + actions + linked spans */}
        <div className="left-col">
          <textarea
            className="doc-box"
            placeholder="Write documentation for this file… Select text, click two code lines, then ‘Link to code’."
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
          />

          <button
            className="link-btn"
            onClick={linkToCode}
            disabled={!docText || !selectedRange()}
          >
            Link to code
          </button>

          {saveMsg && <div className="hint">{saveMsg}</div>}
          {saveErr && <div className="error-box">{saveErr}</div>}

          <div className="links-panel">
            <h3 className="links-title">Linked spans</h3>
            {links?.length ? (
              <ul className="links-list">
                {links.map((a) => (
                  <li key={a._id || `${a.startLine}-${a.endLine}-${a.text?.slice(0,12)}`}>
                    {a.startLine}–{a.endLine} — {a.text || "(no text)"}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="hint">No anchors yet.</div>
            )}
          </div>
        </div>

        {/* RIGHT: code viewer */}
        <div className="right-col">
          <div className="code-panel">
            <div className="code-header">
              Click a line to pick start, then another line to pick end.
              {selectedRange() && (
                <span style={{ marginLeft: 10, color: "#2563eb" }}>
                  Selected {selectedRange().startLine}–{selectedRange().endLine}
                </span>
              )}
            </div>
            <div className="code-body">
              {codeLines.length === 0 ? (
                <div className="hint">Unable to load code.</div>
              ) : (
                <div className="code-lines">
                  {/* gutter */}
                  <div className="code-gutter">
                    <pre>
                      {codeLines.map((_, idx) => (
                        <div
                          key={idx}
                          onClick={() => clickLine(idx + 1)}
                          style={{ cursor: "pointer" }}
                          title="Pick line"
                        >
                          {idx + 1}
                        </div>
                      ))}
                    </pre>
                  </div>
                  {/* source */}
                  <pre className="code-src">
                    {codeLines.map((ln, idx) => {
                      const n = idx + 1;
                      const range = selectedRange();
                      const inSel =
                        range && n >= range.startLine && n <= range.endLine;
                      return (
                        <div
                          key={idx}
                          className={inSel ? "sel" : undefined}
                          onClick={() => clickLine(n)}
                          style={{ cursor: "pointer" }}
                          title="Pick line"
                        >
                          {ln || " "}
                        </div>
                      );
                    })}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* END SPLIT */}
    </div>
  );
}

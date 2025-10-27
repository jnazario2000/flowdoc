import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles.css";

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
  const [aiGenerating, setAiGenerating] = useState(false);

  // fetch code file
  useEffect(() => {
    if (!repoKey || !rawPath) return;
    setLoading(true);
    setLoadErr("");
    setSaveMsg("");

    fetch(`/api/files?${qs({ repoKey, path: rawPath, branch })}`)
        .then(r => (r.ok ? r.json() : r.json().then(j => Promise.reject(j))))
        .then(j => setCode(j.content || ""))
        .catch(err => setLoadErr(err?.error || "Failed to fetch code"))
        .finally(() => setLoading(false));
  }, [repoKey, rawPath, branch]);

  // fetch existing anchors
  useEffect(() => {
    if (!repoKey || !rawPath) return;
    fetch(`/api/anchors?${qs({ repoKey, path: rawPath })}`)
        .then(r => (r.ok ? r.json() : []))
        .then(j => Array.isArray(j) && setLinks(j))
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
  function selectAll() {
    if (codeLines.length === 0) return;
    setPickStart(1);
    setPickEnd(codeLines.length);
    setSaveMsg("");
    setSaveErr("");
  }

  function selectedRange() {
    if (pickStart == null || pickEnd == null) return null;
    const s = Math.min(pickStart, pickEnd);
    const e = Math.max(pickStart, pickEnd);
    return { startLine: s, endLine: e };
  }

  function getSelectedCode() {
    const range = selectedRange();
    if (!range) return "";
    return codeLines.slice(range.startLine - 1, range.endLine).join("\n");
  }

  async function generateWithAI() {
    setSaveMsg("");
    setSaveErr("");

    const range = selectedRange();
    if (!range) return setSaveErr("Pick a start line, then an end line first.");

    const selectedCode = getSelectedCode();
    if (!selectedCode.trim()) return setSaveErr("Selected code is empty.");

    setAiGenerating(true);
    try {
      const r = await fetch("/api/docs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: selectedCode }),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "AI generation failed");
      }

      const result = await r.json();
      setDocText(result.documentation || "");
      setSaveMsg(" Documentation generated");
    } catch (err) {
      setSaveErr(err.message || "AI generation failed");
    } finally {
      setAiGenerating(false);
    }
  }

  async function linkToCode() {
    setSaveMsg("");
    setSaveErr("");

    if (!repoKey || !rawPath) return setSaveErr("Missing repoKey/path.");
    const range = selectedRange();
    if (!range) return setSaveErr("Pick a start line, then an end line.");

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
      setSaveMsg("✅ Saved!");
      fetch(`/api/anchors?${qs({ repoKey, path: rawPath })}`)
          .then(x => (x.ok ? x.json() : []))
          .then(j => Array.isArray(j) && setLinks(j));
    } catch (err) {
      setSaveErr(err.message || "Save failed");
    }
  }

  const range = selectedRange();

  return (
      <div className="editor-shell">
        <h1 className="editor-h1">{repoKey}/{rawPath}</h1>
        <div className="editor-sub">
          {loading ? "Loading code…" : loadErr ? `Load failed: ${loadErr}` : "All changes saved"}
        </div>

        <div className="editor-split">
          {/* LEFT */}
          <div className="left-col">
          <textarea
              className="doc-box"
              placeholder="Write documentation for this file… Or select code lines and click 'Generate with AI'."
              value={docText}
              onChange={e => setDocText(e.target.value)}
          />

            <div className="btn-row">

              <button
                  className="link-btn small-btn"
                  onClick={selectAll}
                  disabled={codeLines.length === 0}
              >
                Select All
              </button>

              <button
                  className={`link-btn ai-btn ${aiGenerating ? "disabled" : ""}`}
                  onClick={generateWithAI}
                  disabled={!range || aiGenerating}
              >
                {aiGenerating ? "Generating..." : "Generate AI Documentation"}
              </button>

              <button
                  className="link-btn"
                  onClick={linkToCode}
                  disabled={!docText || !range}
              >
                Link to code
              </button>
            </div>

            {saveMsg && <div className="hint success-text">{saveMsg}</div>}
            {saveErr && <div className="error-box">{saveErr}</div>}

            <div className="links-panel">
              <h3 className="links-title">Linked spans</h3>
              {links?.length ? (
                  <ul className="links-list">
                    {links.map(a => (
                        <li key={a._id || `${a.startLine}-${a.endLine}-${a.text?.slice(0, 12)}`}>
                          {a.startLine}–{a.endLine} — {a.text || "(no text)"}
                        </li>
                    ))}
                  </ul>
              ) : (
                  <div className="hint">No anchors yet.</div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-col">
            <div className="code-panel">
              <div className="code-header">
                Click a line to pick start, then another line to pick end.
                {range && (
                    <span className="selected-range">
                  Selected {range.startLine}–{range.endLine}
                </span>
                )}
              </div>
              <div className="code-body">
                {codeLines.length === 0 ? (
                    <div className="hint">Unable to load code.</div>
                ) : (
                    <div className="code-lines">
                      <div className="code-gutter">
                    <pre>
                      {codeLines.map((_, idx) => (
                          <div
                              key={idx}
                              onClick={() => clickLine(idx + 1)}
                              className="line-num"
                          >
                            {idx + 1}
                          </div>
                      ))}
                    </pre>
                      </div>
                      <pre className="code-src">
                    {codeLines.map((ln, idx) => {
                      const n = idx + 1;
                      const inSel = range && n >= range.startLine && n <= range.endLine;
                      return (
                          <div
                              key={idx}
                              className={`code-line ${inSel ? "sel" : ""}`}
                              onClick={() => clickLine(n)}
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
      </div>
  );
}

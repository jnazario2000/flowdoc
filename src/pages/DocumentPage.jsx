import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles.css";

function DocumentPage() {
    const { owner, repo, "*": filePath } = useParams();
    const [fileContent, setFileContent] = useState("");
    const [annotations, setAnnotations] = useState([]);
    const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [occurrences, setOccurrences] = useState([]);
    const [overlayPos, setOverlayPos] = useState(null);

    // Fetch file content
    useEffect(() => {
        const fetchFile = async () => {
            setLoading(true);
            try {
                const response = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
                );
                const content = response.data.content
                    ? atob(response.data.content.replace(/\n/g, ""))
                    : "No content available.";
                setFileContent(content);
            } catch (err) {
                setError(err.message || "Failed to fetch file");
            } finally {
                setLoading(false);
            }
        };
        fetchFile();
    }, [owner, repo, filePath]);

    // Add annotation
    const handleAddAnnotation = () => {
        const selection = window.getSelection();
        if (!selection || !selection.toString()) return;

        const selectedText = selection.toString().trim();
        if (!selectedText) return;

        const matches = [];
        let index = 0;
        while ((index = fileContent.indexOf(selectedText, index)) !== -1) {
            matches.push(index);
            index += selectedText.length;
        }

        if (!matches.length) return;

        if (matches.length === 1) {
            addAnnotation(matches[0], selectedText.length);
        } else {
            const range = selection.getRangeAt(0).getBoundingClientRect();
            setOverlayPos({ top: range.bottom + window.scrollY, left: range.left + window.scrollX });
            setOccurrences(matches.map((start) => ({ start, length: selectedText.length })));
        }

        selection.removeAllRanges();
    };

    const addAnnotation = (start, length) => {
        const end = start + length;
        const id = Date.now();
        setAnnotations([...annotations, { id, start, end, note: "" }]);
        setSelectedAnnotationId(id);
        setOverlayPos(null);
        setOccurrences([]);
    };

    const handleNoteChange = (id, value) => {
        setAnnotations((prev) =>
            prev.map((a) => (a.id === id ? { ...a, note: value } : a))
        );
    };

    // Render code safely with callback refs for scrolling
    const renderAnnotatedCodeSafe = () => {
        if (!annotations.length) return fileContent;

        const boundaries = [];
        annotations.forEach((a) => {
            boundaries.push({ pos: a.start, type: "start", id: a.id });
            boundaries.push({ pos: a.end, type: "end", id: a.id });
        });
        boundaries.sort((a, b) => a.pos - b.pos || (a.type === "start" ? -1 : 1));

        const result = [];
        let active = new Set();
        let lastIndex = 0;

        boundaries.forEach((b) => {
            if (b.pos > lastIndex) {
                if (active.size === 0) {
                    result.push(<span key={lastIndex}>{fileContent.slice(lastIndex, b.pos)}</span>);
                } else {
                    const lastId = Array.from(active).pop();
                    result.push(
                        <span
                            key={lastIndex}
                            ref={el => {
                                if (selectedAnnotationId === lastId && el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                            }}
                            className={`highlight ${selectedAnnotationId === lastId ? "selected" : ""}`}
                            onClick={() => setSelectedAnnotationId(lastId)}
                        >
              {fileContent.slice(lastIndex, b.pos)}
            </span>
                    );
                }
            }

            if (b.type === "start") active.add(b.id);
            else active.delete(b.id);

            lastIndex = b.pos;
        });

        if (lastIndex < fileContent.length) {
            if (active.size === 0) {
                result.push(<span key={lastIndex}>{fileContent.slice(lastIndex)}</span>);
            } else {
                const lastId = Array.from(active).pop();
                result.push(
                    <span
                        key={lastIndex}
                        ref={el => {
                            if (selectedAnnotationId === lastId && el) {
                                el.scrollIntoView({ behavior: "smooth", block: "center" });
                            }
                        }}
                        className={`highlight ${selectedAnnotationId === lastId ? "selected" : ""}`}
                        onClick={() => setSelectedAnnotationId(lastId)}
                    >
            {fileContent.slice(lastIndex)}
          </span>
                );
            }
        }

        return result;
    };

    const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);

    return (
        <div className="fileviewer-container">
            {/* Documentation panel */}
            <div className="documentation-panel">
                <h2>Documentation</h2>

                {annotations.length ? (
                    <div className="annotation-list">
                        {annotations.map((ann, idx) => (
                            <div
                                key={ann.id}
                                className={`annotation-item ${selectedAnnotationId === ann.id ? "selected-item" : ""}`}
                                onClick={() => setSelectedAnnotationId(ann.id)}
                            >
                                <strong>Highlight {idx + 1}:</strong>{" "}
                                <span className="highlight-preview">
                  {fileContent.slice(ann.start, ann.end)}
                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No highlights yet.</p>
                )}

                {selectedAnnotation ? (
                    <textarea
                        value={selectedAnnotation.note}
                        onChange={(e) => handleNoteChange(selectedAnnotation.id, e.target.value)}
                        placeholder="Write documentation for selected code..."
                    />
                ) : (
                    <p>Select a highlight to edit documentation.</p>
                )}
            </div>

            {/* Code viewer */}
            <div className="code-viewer">
                <div className="code-viewer-header">
                    <h3>{filePath}</h3>
                    <button onClick={handleAddAnnotation}>Highlight & Add Annotation</button>
                </div>

                {loading && <p>Loading...</p>}
                {error && <p style={{ color: "red" }}>Error: {error}</p>}

                {!loading && !error && (
                    <pre className="code-content">{renderAnnotatedCodeSafe()}</pre>
                )}

                {/* Overlay for multiple occurrences */}
                {overlayPos && (
                    <div
                        className="overlay-menu"
                        style={{ top: overlayPos.top, left: overlayPos.left }}
                    >
                        <p>Select occurrence to highlight:</p>
                        {occurrences.map((occ, i) => (
                            <button key={i} onClick={() => addAnnotation(occ.start, occ.length)}>
                                Occurrence {i + 1}
                            </button>
                        ))}
                        <button onClick={() => setOverlayPos(null)}>Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentPage;

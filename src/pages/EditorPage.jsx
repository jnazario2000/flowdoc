// src/pages/EditorPage.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TipTapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { getCurrentUserId } from '../utils/testUser.js'
import '../styles.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Helper to determine if a file is a documentation file
function isDocFile(path) {
  if (!path) return false
  const docExtensions = ['.md', '.txt', '.doc', '.docx', '.rst', '.adoc']
  const lowerPath = path.toLowerCase()
  return docExtensions.some(ext => lowerPath.endsWith(ext)) || lowerPath.includes('/docs/')
}

export default function EditorPage() {
  const [sp] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const repoKey = sp.get('repoKey') || ''
  const filePath = sp.get('path') || ''
  const branch = sp.get('branch') || 'main'
  const codeFileFromUrl = sp.get('codeFile')
  
  // Get repository info from location state (passed from RepositoryPage)
  const { repoInfo, initialCodeFile } = location.state || {}

  const [documentContent, setDocumentContent] = useState(null)
  const [anchors, setAnchors] = useState([])
  const [status, setStatus] = useState('loading')
  
  // Left side documentation selector
  const [availableDocs, setAvailableDocs] = useState([])
  const [selectedDocPath, setSelectedDocPath] = useState(filePath)
  
  // Right side code viewer
  const [selectedCodeFile, setSelectedCodeFile] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [codeFiles, setCodeFiles] = useState([])
  const [highlightedLines, setHighlightedLines] = useState({ start: null, end: null })
  
  // Anchor creation
  const [selectedLines, setSelectedLines] = useState({ start: null, end: null })
  const [showAnchorForm, setShowAnchorForm] = useState(false)
  const [anchorLabel, setAnchorLabel] = useState('')
  
  // AI generation
  const [aiGenerating, setAiGenerating] = useState(false)
  
  // Print/PDF export
  const [isPrintMode, setIsPrintMode] = useState(false)
  
  const timer = useRef(null)
  const isDoc = isDocFile(filePath)

  // TipTap editor for documentation
  const editor = useEditor({
    extensions: [
      StarterKit,
      TipTapLink.configure({
        openOnClick: false,
        linkOnPaste: false,
        HTMLAttributes: {
          class: 'anchor-link',
          rel: 'noopener noreferrer nofollow',
          target: null,
        },
      }),
      Placeholder.configure({
        placeholder: 'Write your documentation here...',
      }),
    ],
    content: documentContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      setDocumentContent(json)
      saveDocument(json)
    },
    editorProps: {
      handleClick: (view, pos, event) => {
        // Let our custom handler deal with anchor links
        const { target } = event
        if (target instanceof HTMLElement && target.closest('a.anchor-link')) {
          return true // Handled by our custom handler
        }
        return false
      },
    },
  })

  // Load available documentation files
  useEffect(() => {
    async function loadDocs() {
      if (!repoKey) return
      
      try {
        const res = await fetch(`${API}/api/documents/list?repoKey=${encodeURIComponent(repoKey)}`)
        if (res.ok) {
          const data = await res.json()
          setAvailableDocs(data.documents || [])
        }
      } catch (err) {
        console.error('Error loading docs:', err)
      }
    }
    loadDocs()
  }, [repoKey])

  // Load document and set up initial code file
  useEffect(() => {
    async function load() {
      if (!repoKey || !selectedDocPath) return
      
      setStatus('loading')
      try {
        const dRes = await fetch(`${API}/api/documents?repoKey=${encodeURIComponent(repoKey)}&path=${encodeURIComponent(selectedDocPath)}`)
      const d = await dRes.json()
        
        const content = d?.content || { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: d?.body || '' }] }] }
        setDocumentContent(content)
        setAnchors(d?.anchors || [])
        
        if (editor && !editor.isDestroyed) {
          editor.commands.setContent(content)
        }
        
        setStatus('ready')
      } catch (err) {
        console.error('Error loading:', err)
        setStatus('error')
      }
    }
    load()
  }, [repoKey, selectedDocPath])

  // Update editor content when documentContent changes
  useEffect(() => {
    if (editor && documentContent && !editor.isDestroyed) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(documentContent)) {
        editor.commands.setContent(documentContent)
      }
    }
  }, [editor, documentContent])

  // Load available code files from repository
  useEffect(() => {
    async function loadCodeFiles() {
      if (!repoKey) return
      
      try {
        const [owner, repo] = repoKey.split('/')
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`)
        const data = await res.json()
        
        if (data.tree) {
          const files = data.tree
            .filter(item => item.type === 'blob' && !isDocFile(item.path))
            .map(item => item.path)
            .sort()
          
          setCodeFiles(files)
          
          // Set first code file as default if not already set
          if (!selectedCodeFile && files.length > 0) {
            setSelectedCodeFile(files[0])
          }
        }
      } catch (err) {
        console.error('Error loading code files:', err)
      }
    }
    
    if (isDoc) {
      loadCodeFiles()
    }
  }, [repoKey, branch, isDoc])

  // Set initial code file from URL or state
  useEffect(() => {
    const initialFile = codeFileFromUrl || initialCodeFile
    if (initialFile && !selectedCodeFile) {
      setSelectedCodeFile(initialFile)
    }
  }, [codeFileFromUrl, initialCodeFile, selectedCodeFile])

  // Load code content when selectedCodeFile changes
  useEffect(() => {
    async function loadCode() {
      if (!repoKey || !selectedCodeFile) return
      
      try {
        const res = await fetch(`${API}/api/files?repoKey=${encodeURIComponent(repoKey)}&path=${encodeURIComponent(selectedCodeFile)}&branch=${branch}`)
        const data = await res.json()
        setCodeContent(data?.content || '')
      } catch (err) {
        console.error('Error loading code:', err)
        setCodeContent('')
      }
    }
    loadCode()
  }, [repoKey, selectedCodeFile, branch])

  // Auto-save document
  const saveDocument = useCallback((content) => {
    setStatus('dirty')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setStatus('saving')
      try {
        // Save the document
        const res = await fetch(`${API}/api/documents`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            repoKey, 
            path: selectedDocPath, 
            content 
          })
        })
        
        if (res.ok) {
          setStatus('saved')
          
          // Track the edit in history
          try {
            await fetch(`${API}/api/editHistories`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: getCurrentUserId(),
                documentId: `${repoKey}/${selectedDocPath}`,
                repoKey: repoKey,
                path: selectedDocPath,
                action: 'edit',
                changes: 'Document updated',
                newContent: JSON.stringify(content).substring(0, 500), // Store preview of content
                timestamp: new Date()
              })
            })
          } catch (historyErr) {
            console.error('Failed to record edit history:', historyErr)
            // Don't fail the save if history tracking fails
          }
        } else {
          setStatus('error')
        }
      } catch (err) {
        console.error('Error saving:', err)
        setStatus('error')
      }
    }, 900)
  }, [repoKey, selectedDocPath])

  // Handle line selection in code view
  function handleLineClick(lineNum, e) {
    if (e.shiftKey && selectedLines.start !== null) {
      const start = Math.min(selectedLines.start, lineNum)
      const end = Math.max(selectedLines.start, lineNum)
      setSelectedLines({ start, end })
    } else {
      setSelectedLines({ start: lineNum, end: lineNum })
    }
  }

  // Insert anchor link into documentation
  async function insertAnchorLink() {
    if (!selectedLines.start || !selectedLines.end || !anchorLabel.trim()) {
      alert('Please select lines and enter a label')
      return
    }

    if (!editor || editor.isDestroyed) return

    try {
      // Create anchor in database
      const res = await fetch(`${API}/api/documents/anchors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoKey,
          path: filePath,
          startLine: selectedLines.start,
          endLine: selectedLines.end,
          text: anchorLabel,
          docSpan: selectedCodeFile
        })
      })

      if (res.ok) {
        const data = await res.json()
        setAnchors(data.document?.anchors || [])
        
        // Insert link at cursor position
        const anchorData = `${selectedCodeFile}:${selectedLines.start}-${selectedLines.end}`
        editor.chain().focus().setLink({ href: `#anchor:${anchorData}` }).insertContent(anchorLabel).run()
        
        // Clear form
        setShowAnchorForm(false)
        setAnchorLabel('')
        setSelectedLines({ start: null, end: null })
      } else {
        const error = await res.json()
        alert('Error creating anchor: ' + (error.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error creating anchor:', err)
      alert('Error creating anchor: ' + err.message)
    }
  }

  // Generate documentation with AI
  async function generateWithAI() {
    if (!selectedLines.start || !selectedLines.end) {
      alert('Please select lines first by clicking on line numbers')
      return
    }

    // Get selected code
    const codeLines = (codeContent || '').split('\n')
    const selectedCode = codeLines.slice(selectedLines.start - 1, selectedLines.end).join('\n')
    
    if (!selectedCode.trim()) {
      alert('Selected code is empty')
      return
    }

    setAiGenerating(true)
    try {
      const r = await fetch('/api/docs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: selectedCode }),
      })

      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || 'AI generation failed')
      }

      const result = await r.json()
      const generatedDoc = result.documentation || ''
      
      // Insert generated documentation into editor
      if (editor && !editor.isDestroyed && generatedDoc) {
        editor.commands.insertContent(generatedDoc)
        setStatus('dirty')
      }
    } catch (err) {
      alert(err.message || 'AI generation failed')
    } finally {
      setAiGenerating(false)
    }
  }

  // Print/Export as PDF
  function handlePrint() {
    window.print()
  }

  // Handle anchor link click
  const handleAnchorClick = useCallback((e) => {
    // Check if the click target is a link or within a link
    const link = e.target.closest('a.anchor-link')
    
    if (link) {
      // Prevent default navigation
      e.preventDefault()
      e.stopPropagation()
      
      const href = link.getAttribute('href')
      
      if (href && href.includes('#anchor:')) {
        const anchorData = href.split('#anchor:')[1]
        const [file, range] = anchorData.split(':')
        const [start, end] = range.split('-').map(Number)
        
        console.log('Anchor clicked:', { file, start, end })
        
        // Switch to the code file if different
        if (file && file !== selectedCodeFile) {
          setSelectedCodeFile(file)
        }
        
        // Highlight the lines
        setHighlightedLines({ start, end })
        
        // Scroll to the line after a short delay to ensure code is loaded
        setTimeout(() => {
          const lineElement = document.querySelector(`[data-line="${start}"]`)
          if (lineElement) {
            lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
      }
    }
  }, [selectedCodeFile])

  // Check if line is selected or highlighted
  function isLineSelected(lineNum) {
    return selectedLines.start !== null && selectedLines.end !== null &&
           lineNum >= selectedLines.start && lineNum <= selectedLines.end
  }

  function isLineHighlighted(lineNum) {
    return highlightedLines.start !== null && highlightedLines.end !== null &&
           lineNum >= highlightedLines.start && lineNum <= highlightedLines.end
  }

  const goBackToRepository = () => {
    if (repoKey) {
      navigate('/repositorypage', { state: { repoKey, repoInfo } })
    } else {
      navigate('/')
    }
  }

  if (!repoKey) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>No repository selected. Please select a repository.</p>
        <button onClick={goBackToRepository} style={{ 
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          ← Back to Repository
        </button>
      </div>
    )
  }

  const codeLines = (codeContent || '').split('\n')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ 
        padding: '1rem', 
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button 
              onClick={goBackToRepository}
              style={{ 
                marginRight: '1rem',
                padding: '0.4rem 0.8rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9em'
              }}
            >
              ← Back to Repository
            </button>
            <strong>{selectedDocPath || 'No document selected'}</strong>
            <span style={{ marginLeft: '1rem', fontSize: '0.9em', opacity: 0.7 }}>
              {repoKey} ({branch})
            </span>
          </div>
          <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
            {status === 'loading' ? 'Loading…' : 
             status === 'saving' ? 'Saving…' : 
             status === 'dirty' ? 'Unsaved changes' : 
             status === 'error' ? '❌ Error' : 
             '✓ Saved'}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Documentation editor (Left side) */}
        <div className="doc-editor-panel" style={{ 
          width: '50%', 
          display: 'flex', 
          flexDirection: 'column',
          borderRight: '1px solid #ddd',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Documentation Editor</h3>
              <button
                onClick={handlePrint}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                title="Print or export as PDF"
              >
                🖨️ Export PDF
              </button>
            </div>
            <select
              value={selectedDocPath}
              onChange={(e) => setSelectedDocPath(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontSize: '0.9em',
                marginBottom: '0.5rem'
              }}
            >
              <option value="">Select a document...</option>
              {availableDocs.map(doc => (
                <option key={doc.path} value={doc.path}>{doc.path}</option>
              ))}
            </select>
            <p style={{ margin: '0', fontSize: '0.85em', opacity: 0.7 }}>
              Click "Create Anchor Link" after selecting code lines on the right
            </p>
          </div>
          <div style={{ 
            flex: 1, 
            padding: '1rem',
            overflow: 'auto'
          }}>
            {!selectedDocPath ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                <p>Select a documentation file from the dropdown above to start editing</p>
              </div>
            ) : editor ? (
              <div onClick={handleAnchorClick}>
                <EditorContent editor={editor} />
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                <p>Loading editor...</p>
              </div>
            )}
          </div>
        </div>

        {/* Code viewer (Right side) */}
        <div className="code-viewer-panel" style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            padding: '1rem', 
            borderBottom: '1px solid #ddd',
            backgroundColor: '#f5f5f5'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Code Viewer</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className={`link-btn ai-btn ${aiGenerating ? 'disabled' : ''}`}
                  onClick={generateWithAI}
                  disabled={!selectedLines.start || !selectedLines.end || aiGenerating}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.9em'
                  }}
                >
                  {aiGenerating ? 'Generating...' : 'Generate AI Documentation'}
                </button>
                <button 
                  onClick={() => {
                    if (selectedLines.start) {
                      setShowAnchorForm(!showAnchorForm)
                    } else {
                      alert('Select lines first by clicking on line numbers (shift-click to select range)')
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: selectedLines.start ? '#007bff' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedLines.start ? 'pointer' : 'not-allowed',
                    fontSize: '0.9em'
                  }}
                >
                  Create Anchor Link
                </button>
              </div>
            </div>
            <select
              value={selectedCodeFile}
              onChange={(e) => {
                setSelectedCodeFile(e.target.value)
                setSelectedLines({ start: null, end: null })
                setHighlightedLines({ start: null, end: null })
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontSize: '0.9em'
              }}
            >
              <option value="">Select a code file...</option>
              {codeFiles.map(file => (
                <option key={file} value={file}>{file}</option>
              ))}
            </select>
          </div>

          {/* Anchor creation form */}
          {showAnchorForm && (
            <div style={{ 
              padding: '1rem', 
              borderBottom: '1px solid #ddd',
              backgroundColor: '#e7f3ff'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95em' }}>
                Create Anchor Link (Lines {selectedLines.start}-{selectedLines.end})
              </h4>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '0.25rem' }}>
                  Link Label (will appear in documentation):
                </label>
                <input
                  type="text"
                  value={anchorLabel}
                  onChange={(e) => setAnchorLabel(e.target.value)}
                  placeholder="e.g., 'authentication logic' or 'API endpoint'"
                  onKeyPress={(e) => e.key === 'Enter' && insertAnchorLink()}
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '0.9em'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={insertAnchorLink}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9em'
                  }}
                >
                  Insert Link
                </button>
                <button 
                  onClick={() => {
                    setShowAnchorForm(false)
                    setAnchorLabel('')
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9em'
                  }}
                >
                  Cancel
                </button>
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8em', opacity: 0.7 }}>
                The link will be inserted at your cursor position in the documentation editor
              </p>
            </div>
          )}

          {/* Code display */}
          <div style={{ flex: 1, overflow: 'auto', padding: '1rem', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#f8f8f8' }}>
            {!selectedCodeFile ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                <p>Select a code file from the dropdown above to view code</p>
              </div>
            ) : codeLines.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                <p>Loading code...</p>
              </div>
            ) : (
              codeLines.map((line, i) => {
                const lineNum = i + 1
                const isSelected = isLineSelected(lineNum)
                const isHighlighted = isLineHighlighted(lineNum)
                
                return (
                  <div 
                    key={i}
                    data-line={lineNum}
                    style={{ 
                      display: 'flex',
                      backgroundColor: isHighlighted ? '#fff3b0' : isSelected ? '#d4e9ff' : 'transparent',
                      borderLeft: isHighlighted ? '4px solid #ffc107' : isSelected ? '3px solid #007bff' : 'none',
                      paddingLeft: isHighlighted || isSelected ? '0.5rem' : '0',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span 
                      onClick={(e) => handleLineClick(lineNum, e)}
                      style={{ 
                        display: 'inline-block',
                        minWidth: '3rem',
                        textAlign: 'right',
                        marginRight: '1rem',
                        opacity: 0.5,
                        userSelect: 'none',
                        cursor: 'pointer',
                        fontWeight: isSelected || isHighlighted ? 'bold' : 'normal',
                        color: isHighlighted ? '#f57c00' : isSelected ? '#0066cc' : '#666'
                      }}
                    >
                      {lineNum}
                    </span>
                    <span style={{ whiteSpace: 'pre', flex: 1 }}>{line}</span>
                  </div>
                )
              })
            )}
          </div>

          {/* Info panel */}
          {selectedCodeFile && (
            <div style={{ 
              borderTop: '1px solid #ddd',
              padding: '0.75rem 1rem',
              backgroundColor: '#f9f9f9',
              fontSize: '0.85em'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <strong>Selected:</strong> {selectedLines.start && selectedLines.end 
                    ? `Lines ${selectedLines.start}-${selectedLines.end}` 
                    : 'None'}
                </span>
                {highlightedLines.start && (
                  <button
                    onClick={() => setHighlightedLines({ start: null, end: null })}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.85em',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Highlight
                  </button>
                )}
              </div>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>
                Click line numbers to select (Shift+Click for range)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

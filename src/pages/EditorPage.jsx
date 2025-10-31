// src/pages/EditorPage.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TipTapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { getCurrentUserId, getCurrentUser, isAuthenticated } from '../utils/authUtils.js'
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
  const [allAnchors, setAllAnchors] = useState([])
  const [status, setStatus] = useState('loading')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Left side documentation selector
  const [availableDocs, setAvailableDocs] = useState([])
  const [selectedDocPath, setSelectedDocPath] = useState(filePath)
  
  // Right side code viewer
  const [selectedCodeFile, setSelectedCodeFile] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [codeFiles, setCodeFiles] = useState([])
  const [highlightedLines, setHighlightedLines] = useState({ start: null, end: null })
  const [showAllAnchors, setShowAllAnchors] = useState(false)
  
  // Anchor creation
  const [selectedLines, setSelectedLines] = useState({ start: null, end: null })
  const [showAnchorForm, setShowAnchorForm] = useState(false)
  const [anchorLabel, setAnchorLabel] = useState('')
  
  // AI generation
  const [aiGenerating, setAiGenerating] = useState(false)
  
  // Print/PDF export
  const [isPrintMode, setIsPrintMode] = useState(false)
  
  // Navigation notification
  const [navigationNotification, setNavigationNotification] = useState(null)
  
  // Access control
  const [accessDenied, setAccessDenied] = useState(false)
  const [accessChecking, setAccessChecking] = useState(true)
  const [repositoryData, setRepositoryData] = useState(null)
  
  const timer = useRef(null)
  const notificationTimer = useRef(null)
  const isDoc = isDocFile(filePath)

  // TipTap editor for documentation
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default link extension from StarterKit
        link: false,
      }),
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
      setHasUnsavedChanges(true)
      setStatus('unsaved')
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

  // Check repository access
  useEffect(() => {
    async function checkAccess() {
      if (!repoKey) {
        setAccessChecking(false)
        return
      }
      
      setAccessChecking(true)
      setAccessDenied(false)
      
      try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
          setAccessDenied(true)
          setAccessChecking(false)
          return
        }
        
        const currentUser = getCurrentUser()
        const userId = currentUser._id || currentUser.id
        
        // Check repository access
        const res = await fetch(`${API}/api/repositories/${encodeURIComponent(repoKey)}/access?userId=${userId}`)
        
        if (res.ok) {
          const data = await res.json()
          setRepositoryData(data)
          
          if (!data.hasAccess) {
            setAccessDenied(true)
          }
        } else {
          // If repository doesn't exist in DB, allow access (legacy support)
          console.warn('Repository not found in database, allowing access for legacy support')
        }
      } catch (err) {
        console.error('Error checking repository access:', err)
      } finally {
        setAccessChecking(false)
      }
    }
    
    checkAccess()
  }, [repoKey])

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

  // Load all anchors from all documents in the repository
  useEffect(() => {
    async function loadAllAnchors() {
      if (!repoKey || availableDocs.length === 0) return
      
      try {
        // Fetch all documents and collect their anchors
        const allAnchorsArray = []
        
        for (const doc of availableDocs) {
          try {
            const res = await fetch(`${API}/api/documents?repoKey=${encodeURIComponent(repoKey)}&path=${encodeURIComponent(doc.path)}`)
            if (res.ok) {
              const data = await res.json()
              if (data.anchors && Array.isArray(data.anchors)) {
                // Add document path to each anchor for reference
                const anchorsWithDoc = data.anchors.map(anchor => ({
                  ...anchor,
                  documentPath: doc.path
                }))
                allAnchorsArray.push(...anchorsWithDoc)
              }
            }
          } catch (err) {
            console.error(`Error loading anchors from ${doc.path}:`, err)
          }
        }
        
        setAllAnchors(allAnchorsArray)
      } catch (err) {
        console.error('Error loading all anchors:', err)
      }
    }
    
    loadAllAnchors()
  }, [repoKey, availableDocs])

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

  // Reset unsaved changes when switching documents
  useEffect(() => {
    setHasUnsavedChanges(false)
    setStatus('ready')
  }, [selectedDocPath])

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

  // Manual save document
  const saveDocument = useCallback(async () => {
    if (!hasUnsavedChanges || !documentContent) {
      return
    }

    setStatus('saving')
    try {
      // Save the document
      const res = await fetch(`${API}/api/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoKey, 
          path: selectedDocPath, 
          content: documentContent 
        })
      })
      
      if (res.ok) {
        setStatus('saved')
        setHasUnsavedChanges(false)
        
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
              changes: 'Document saved',
              newContent: JSON.stringify(documentContent).substring(0, 500),
              timestamp: new Date()
            })
          })
        } catch (historyErr) {
          console.error('Failed to record edit history:', historyErr)
          // Don't fail the save if history tracking fails
        }

        // Show success notification
        setNavigationNotification({
          message: '✓ Document saved successfully',
          type: 'success'
        })
        
        clearTimeout(notificationTimer.current)
        notificationTimer.current = setTimeout(() => {
          setNavigationNotification(null)
        }, 2000)
      } else {
        setStatus('error')
        alert('Failed to save document')
      }
    } catch (err) {
      console.error('Error saving:', err)
      setStatus('error')
      alert('Error saving document: ' + err.message)
    }
  }, [repoKey, selectedDocPath, documentContent, hasUnsavedChanges])

  // Keyboard shortcut for save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveDocument()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveDocument])

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
        
        // Refresh all anchors to include the new one
        if (data.document?.anchors) {
          // Update allAnchors by replacing anchors for this document
          setAllAnchors(prev => {
            // Remove old anchors from this document
            const filtered = prev.filter(a => a.documentPath !== selectedDocPath)
            // Add updated anchors with document path
            const updated = data.document.anchors.map(anchor => ({
              ...anchor,
              documentPath: selectedDocPath
            }))
            return [...filtered, ...updated]
          })
        }
        
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
      const r = await fetch(`${API}/api/docs/generate`, {
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

  // Get all anchors for the current code file from ALL documents
  const getCurrentFileAnchors = useCallback(() => {
    if (!selectedCodeFile || !allAnchors || allAnchors.length === 0) return []
    return allAnchors.filter(anchor => anchor.docSpan === selectedCodeFile)
  }, [selectedCodeFile, allAnchors])

  // Check if line is selected or highlighted
  function isLineSelected(lineNum) {
    return selectedLines.start !== null && selectedLines.end !== null &&
           lineNum >= selectedLines.start && lineNum <= selectedLines.end
  }

  function isLineHighlighted(lineNum) {
    return highlightedLines.start !== null && highlightedLines.end !== null &&
           lineNum >= highlightedLines.start && lineNum <= highlightedLines.end
  }

  // Check if line is part of any anchor (for show all anchors mode)
  function isLineAnchored(lineNum) {
    if (!showAllAnchors) return false
    const fileAnchors = getCurrentFileAnchors()
    return fileAnchors.some(anchor => 
      lineNum >= anchor.startLine && lineNum <= anchor.endLine
    )
  }

  // Get anchor info for a specific line
  function getAnchorForLine(lineNum) {
    if (!showAllAnchors) return null
    const fileAnchors = getCurrentFileAnchors()
    return fileAnchors.find(anchor => 
      lineNum >= anchor.startLine && lineNum <= anchor.endLine
    )
  }

  // Navigate to documentation containing the anchor
  function navigateToDocumentWithAnchor(anchor) {
    if (!anchor || !anchor.documentPath) return
    
    // Switch to the document containing this anchor
    setSelectedDocPath(anchor.documentPath)
    
    // Highlight the lines in code viewer
    setHighlightedLines({ start: anchor.startLine, end: anchor.endLine })
    
    // Show a notification
    setNavigationNotification({
      message: `📄 Jumped to documentation: ${anchor.documentPath}`,
      type: 'success'
    })
    
    // Clear notification after 3 seconds
    clearTimeout(notificationTimer.current)
    notificationTimer.current = setTimeout(() => {
      setNavigationNotification(null)
    }, 3000)
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

  // Show loading state while checking access
  if (accessChecking) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Checking Access...</h2>
        <p>Verifying your permissions for this repository...</p>
      </div>
    )
  }

  // Show access denied message
  if (accessDenied) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ 
          fontSize: '4rem', 
          marginBottom: '1rem'
        }}>
          🔒
        </div>
        <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Access Denied</h2>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
          {repositoryData?.repository?.isPrivate 
            ? "This is a private repository. You don't have permission to access it."
            : "You need to be signed in to access this repository."}
        </p>
        {!isAuthenticated() ? (
          <button 
            onClick={() => navigate('/signin')}
            style={{ 
              padding: '0.75rem 2rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              marginRight: '1rem'
            }}
          >
            Sign In
          </button>
        ) : (
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
            If you believe you should have access, please contact the repository owner.
          </p>
        )}
        <button 
          onClick={() => navigate('/')}
          style={{ 
            padding: '0.75rem 2rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            marginTop: '1rem'
          }}
        >
          ← Back to Home
        </button>
      </div>
    )
  }

  const codeLines = (codeContent || '').split('\n')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      {/* Navigation Notification */}
      {navigationNotification && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: navigationNotification.type === 'success' ? '#28a745' : '#007bff',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '0.95em',
          fontWeight: '500',
          animation: 'slideDown 0.3s ease-out',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {navigationNotification.message}
          <button
            onClick={() => setNavigationNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '1.2em',
              cursor: 'pointer',
              padding: '0',
              marginLeft: '0.5rem',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>
      )}
      
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
          <div style={{ 
            fontSize: '0.9em', 
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {status === 'loading' ? (
              <span style={{ opacity: 0.8 }}>Loading…</span>
            ) : status === 'saving' ? (
              <span style={{ opacity: 0.8 }}>Saving…</span>
            ) : status === 'unsaved' ? (
              <span style={{ color: '#f57c00', fontWeight: 'bold' }}>● Unsaved changes</span>
            ) : status === 'error' ? (
              <span style={{ color: '#dc3545' }}>❌ Error</span>
            ) : hasUnsavedChanges ? (
              <span style={{ color: '#f57c00', fontWeight: 'bold' }}>● Unsaved changes</span>
            ) : (
              <span style={{ color: '#28a745', opacity: 0.8 }}>✓ Saved</span>
            )}
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
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={saveDocument}
                  disabled={!hasUnsavedChanges}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: hasUnsavedChanges ? '#28a745' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
                    fontSize: '0.9em',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    opacity: hasUnsavedChanges ? 1 : 0.6,
                    transition: 'all 0.2s ease'
                  }}
                  title={hasUnsavedChanges ? 'Save changes (Ctrl+S / Cmd+S)' : 'No unsaved changes'}
                >
                  💾 Save
                  {hasUnsavedChanges && <span style={{ fontSize: '1.2em' }}>●</span>}
                </button>
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
            <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
              <p style={{ margin: '0 0 0.25rem 0' }}>
                💡 Click "Create Anchor Link" after selecting code lines on the right
              </p>
              <p style={{ margin: '0', fontStyle: 'italic' }}>
                Press <strong>Ctrl+S</strong> (or <strong>Cmd+S</strong>) to save your changes
              </p>
            </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowAllAnchors(!showAllAnchors)
                  if (!showAllAnchors) {
                    // Clear any manual highlights when showing all anchors
                    setHighlightedLines({ start: null, end: null })
                  }
                }}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: showAllAnchors ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                title={showAllAnchors ? 'Hide all anchor highlights' : 'Show all anchor highlights in this file'}
              >
                {showAllAnchors ? '✓ ' : ''}Show All Anchors
                {selectedCodeFile && getCurrentFileAnchors().length > 0 && (
                  <span style={{ 
                    backgroundColor: 'rgba(255,255,255,0.3)', 
                    padding: '2px 6px', 
                    borderRadius: '10px',
                    fontSize: '0.9em',
                    fontWeight: 'bold'
                  }}>
                    {getCurrentFileAnchors().length}
                  </span>
                )}
              </button>
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
                const isAnchored = isLineAnchored(lineNum)
                const anchorInfo = getAnchorForLine(lineNum)
                
                // Determine background color based on priority: manual highlight > anchored > selected
                let backgroundColor = 'transparent'
                let borderLeft = 'none'
                let paddingLeft = '0'
                
                if (isHighlighted) {
                  backgroundColor = '#fff3b0'
                  borderLeft = '4px solid #ffc107'
                  paddingLeft = '0.5rem'
                } else if (isAnchored) {
                  backgroundColor = '#d4f4dd'
                  borderLeft = '4px solid #28a745'
                  paddingLeft = '0.5rem'
                } else if (isSelected) {
                  backgroundColor = '#d4e9ff'
                  borderLeft = '3px solid #007bff'
                  paddingLeft = '0.5rem'
                }
                
                return (
                  <div 
                    key={i}
                    data-line={lineNum}
                    onClick={(e) => {
                      // If it's an anchored line and not clicking on line number, navigate to document
                      if (isAnchored && anchorInfo && !e.target.closest('.line-number')) {
                        navigateToDocumentWithAnchor(anchorInfo)
                      }
                    }}
                    style={{ 
                      display: 'flex',
                      backgroundColor,
                      borderLeft,
                      paddingLeft,
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      cursor: isAnchored ? 'pointer' : 'default'
                    }}
                    title={isAnchored && anchorInfo ? `Click to view in documentation: ${anchorInfo.text} (${anchorInfo.documentPath})` : ''}
                  >
                    <span 
                      className="line-number"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLineClick(lineNum, e)
                      }}
                      style={{ 
                        display: 'inline-block',
                        minWidth: '3rem',
                        textAlign: 'right',
                        marginRight: '1rem',
                        opacity: 0.5,
                        userSelect: 'none',
                        cursor: 'pointer',
                        fontWeight: isSelected || isHighlighted || isAnchored ? 'bold' : 'normal',
                        color: isHighlighted ? '#f57c00' : isAnchored ? '#28a745' : isSelected ? '#0066cc' : '#666'
                      }}
                    >
                      {lineNum}
                      {isAnchored && anchorInfo && lineNum === anchorInfo.startLine && (
                        <span style={{ 
                          marginLeft: '4px', 
                          fontSize: '0.8em',
                          color: '#28a745'
                        }}>
                          🔗
                        </span>
                      )}
                    </span>
                    <span style={{ 
                      whiteSpace: 'pre', 
                      flex: 1,
                      position: 'relative'
                    }}>
                      {line}
                      {isAnchored && anchorInfo && lineNum === anchorInfo.startLine && (
                        <span style={{
                          position: 'absolute',
                          right: '0.5rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '0.75em',
                          color: '#28a745',
                          backgroundColor: 'rgba(40, 167, 69, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontWeight: 'bold',
                          opacity: 0.7,
                          pointerEvents: 'none'
                        }}>
                          📄 Click to view in doc
                        </span>
                      )}
                    </span>
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
              {showAllAnchors && getCurrentFileAnchors().length > 0 ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.5rem', 
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#e7f3e9',
                    borderRadius: '4px',
                    border: '1px solid #28a745'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ 
                        width: '20px', 
                        height: '3px', 
                        backgroundColor: '#28a745',
                        display: 'inline-block'
                      }}></span>
                      <span style={{ fontWeight: 'bold' }}>Anchored sections (click to navigate)</span>
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#555', fontStyle: 'italic' }}>
                      💡 Click any green-highlighted code to jump to its documentation
                    </div>
                  </div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    <strong>Anchors in this file ({getCurrentFileAnchors().length}):</strong>
                    <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', listStyle: 'none' }}>
                      {getCurrentFileAnchors().map((anchor, idx) => (
                        <li key={idx} style={{ marginBottom: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setHighlightedLines({ start: anchor.startLine, end: anchor.endLine })
                              const lineElement = document.querySelector(`[data-line="${anchor.startLine}"]`)
                              if (lineElement) {
                                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#28a745',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '0.9em',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ fontWeight: 'bold' }}>
                              Lines {anchor.startLine}-{anchor.endLine}: {anchor.text}
                            </div>
                            {anchor.documentPath && (
                              <div style={{ 
                                fontSize: '0.85em', 
                                color: '#6c757d', 
                                fontStyle: 'italic',
                                marginTop: '2px'
                              }}>
                                📄 {anchor.documentPath}
                              </div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>
                  Click line numbers to select (Shift+Click for range)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

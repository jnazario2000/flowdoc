// FILE 2: src/pages/EditorPage.jsx
// Copy this entire file to replace your existing EditorPage.jsx

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
  const roleFromUrl = sp.get('role')

  const { repoInfo, initialCodeFile, token: stateToken, userRole: stateRole } = location.state || {}

  // NEW: User role state
  const [userRole, setUserRole] = useState(roleFromUrl || stateRole || 'reader')

  const [documentContent, setDocumentContent] = useState(null)
  const [anchors, setAnchors] = useState([])
  const [allAnchors, setAllAnchors] = useState([])
  const [status, setStatus] = useState('loading')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [token, setToken] = useState(stateToken || null)

  const [availableDocs, setAvailableDocs] = useState([])
  const [selectedDocPath, setSelectedDocPath] = useState(filePath)

  const [selectedCodeFile, setSelectedCodeFile] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [codeFiles, setCodeFiles] = useState([])
  const [codeFileSearchTerm, setCodeFileSearchTerm] = useState('')
  const [highlightedLines, setHighlightedLines] = useState({ start: null, end: null })
  const [showAllAnchors, setShowAllAnchors] = useState(false)

  const [selectedLines, setSelectedLines] = useState({ start: null, end: null })
  const [showAnchorForm, setShowAnchorForm] = useState(false)
  const [anchorLabel, setAnchorLabel] = useState('')

  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPreview, setAiPreview] = useState(null)
  const [showAiPreview, setShowAiPreview] = useState(false)

  const [isPrintMode, setIsPrintMode] = useState(false)
  const [navigationNotification, setNavigationNotification] = useState(null)

  const [accessDenied, setAccessDenied] = useState(false)
  const [accessChecking, setAccessChecking] = useState(true)
  const [repositoryData, setRepositoryData] = useState(null)

  const timer = useRef(null)
  const notificationTimer = useRef(null)

  // TipTap editor - editable only for commenters
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
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
        placeholder: userRole === 'commenter' ? 'Write your documentation here...' : 'No documentation available',
      }),
    ],
    content: documentContent,
    editable: userRole === 'commenter', // NEW: Only commenters can edit
    onUpdate: ({ editor }) => {
      if (userRole === 'commenter') {
        const json = editor.getJSON()
        setDocumentContent(json)
        setHasUnsavedChanges(true)
        setStatus('unsaved')
      }
    },
    editorProps: {
      handleClick: (view, pos, event) => {
        const { target } = event
        const link = target instanceof HTMLElement ? target.closest('a.anchor-link') : null

        if (link) {
          event.preventDefault()
          event.stopPropagation()

          const href = link.getAttribute('href')
          if (href && href.includes('#anchor:')) {
            const anchorData = href.split('#anchor:')[1]
            const [file, range] = anchorData.split(':')
            const [start, end] = range.split('-').map(Number)

            if (file && file !== selectedCodeFile) {
              setSelectedCodeFile(file)
            }

            setHighlightedLines({ start, end })

            setTimeout(() => {
              const lineElement = document.querySelector(`[data-line="${start}"]`)
              if (lineElement) {
                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }, 300)
          }

          return true
        }
        return false
      },
    },
  })

  // Update editor editability when role changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(userRole === 'commenter')
    }
  }, [editor, userRole])

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
        if (!isAuthenticated()) {
          setAccessDenied(true)
          setAccessChecking(false)
          return
        }

        const currentUser = getCurrentUser()
        const userId = currentUser._id || currentUser.id

        const res = await fetch(`${API}/api/repositories/${encodeURIComponent(repoKey)}/access?userId=${userId}`)

        if (res.ok) {
          const data = await res.json()
          setRepositoryData(data)

          if (!data.hasAccess) {
            setAccessDenied(true)
          }
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

  // Load all anchors
  useEffect(() => {
    async function loadAllAnchors() {
      if (!repoKey || availableDocs.length === 0) return

      try {
        const allAnchorsArray = []

        for (const doc of availableDocs) {
          try {
            const res = await fetch(`${API}/api/documents?repoKey=${encodeURIComponent(repoKey)}&path=${encodeURIComponent(doc.path)}`)
            if (res.ok) {
              const data = await res.json()
              if (data.anchors && Array.isArray(data.anchors)) {
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

  // Load document
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

  // Update editor content
  useEffect(() => {
    if (editor && documentContent && !editor.isDestroyed) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(documentContent)) {
        editor.commands.setContent(documentContent)
      }
    }
  }, [editor, documentContent])

  // Fetch token
  useEffect(() => {
    async function fetchToken() {
      if (!token && repoKey) {
        try {
          const encodedRepoKey = encodeURIComponent(repoKey)
          const res = await fetch(`${API}/api/project-pages/by-repo?repoKey=${encodedRepoKey}`)
          if (res.ok) {
            const project = await res.json()
            if (project.token) {
              setToken(project.token)
            }
          }
        } catch (err) {
          console.error('Error fetching token:', err)
        }
      }
    }

    fetchToken()
  }, [repoKey, token])

  // Reset unsaved changes when switching documents
  useEffect(() => {
    setHasUnsavedChanges(false)
    setStatus('ready')
  }, [selectedDocPath])

  // Load code files
  useEffect(() => {
    async function loadCodeFiles() {
      if (!repoKey) return

      try {
        const [owner, repo] = repoKey.split('/')
        const headers = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers })

        if (!res.ok) {
          console.error('Error loading code files:', res.status)
          return
        }

        const data = await res.json()

        if (data.tree) {
          const files = data.tree
              .filter(item => item.type === 'blob' && !isDocFile(item.path))
              .map(item => item.path)
              .sort()

          setCodeFiles(files)
        }
      } catch (err) {
        console.error('Error loading code files:', err)
      }
    }

    loadCodeFiles()
  }, [repoKey, branch, token])

  // Set initial code file
  useEffect(() => {
    const initialFile = codeFileFromUrl || initialCodeFile
    if (initialFile && !selectedCodeFile) {
      setSelectedCodeFile(initialFile)
    } else if (!initialFile && !selectedCodeFile && codeFiles.length > 0) {
      setSelectedCodeFile(codeFiles[0])
    }
  }, [codeFileFromUrl, initialCodeFile, selectedCodeFile, codeFiles])

  // Load code content
  useEffect(() => {
    async function loadCode() {
      if (!repoKey || !selectedCodeFile) return

      try {
        let url = `${API}/api/files?repoKey=${encodeURIComponent(repoKey)}&path=${encodeURIComponent(selectedCodeFile)}&branch=${branch}`
        if (token) {
          url += `&token=${encodeURIComponent(token)}`
        }
        const res = await fetch(url)
        const data = await res.json()
        setCodeContent(data?.content || '')
      } catch (err) {
        console.error('Error loading code:', err)
        setCodeContent('')
      }
    }
    loadCode()
  }, [repoKey, selectedCodeFile, branch, token])

  // Save document (commenters only)
  const saveDocument = useCallback(async () => {
    if (userRole !== 'commenter' || !hasUnsavedChanges || !documentContent) {
      return
    }

    setStatus('saving')
    try {
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
        }

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
  }, [repoKey, selectedDocPath, documentContent, hasUnsavedChanges, userRole])

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (userRole === 'commenter' && (e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveDocument()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveDocument, userRole])

  // Handle line selection (commenters only)
  function handleLineClick(lineNum, e) {
    if (userRole !== 'commenter') return

    if (e.shiftKey && selectedLines.start !== null) {
      const start = Math.min(selectedLines.start, lineNum)
      const end = Math.max(selectedLines.start, lineNum)
      setSelectedLines({ start, end })
    } else {
      setSelectedLines({ start: lineNum, end: lineNum })
    }
  }

  // Insert anchor link (commenters only)
  async function insertAnchorLink() {
    if (userRole !== 'commenter') return

    if (!selectedLines.start || !selectedLines.end || !anchorLabel.trim()) {
      alert('Please select lines and enter a label')
      return
    }

    if (!selectedDocPath) {
      alert('Please select a document first')
      return
    }

    if (!selectedCodeFile) {
      alert('Please select a code file first')
      return
    }

    if (!editor || editor.isDestroyed) return

    try {
      const res = await fetch(`${API}/api/documents/anchors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoKey,
          path: selectedDocPath,
          startLine: selectedLines.start,
          endLine: selectedLines.end,
          text: anchorLabel,
          docSpan: selectedCodeFile
        })
      })

      if (res.ok) {
        const data = await res.json()
        setAnchors(data.document?.anchors || [])

        if (data.document?.anchors) {
          setAllAnchors(prev => {
            const filtered = prev.filter(a => a.documentPath !== selectedDocPath)
            const updated = data.document.anchors.map(anchor => ({
              ...anchor,
              documentPath: selectedDocPath
            }))
            return [...filtered, ...updated]
          })
        }

        const anchorData = `${selectedCodeFile}:${selectedLines.start}-${selectedLines.end}`
        editor.chain().focus().setLink({ href: `#anchor:${anchorData}` }).insertContent(anchorLabel).run()

        setShowAnchorForm(false)
        setAnchorLabel('')
        setSelectedLines({ start: null, end: null })
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert('Error creating anchor: ' + (error.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error creating anchor:', err)
      alert('Error creating anchor: ' + err.message)
    }
  }

  // Generate documentation with AI (commenters only)
  async function generateWithAI() {
    if (userRole !== 'commenter') return

    if (!selectedLines.start || !selectedLines.end) {
      alert('Please select lines first')
      return
    }

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

      if (generatedDoc) {
        setAiPreview(generatedDoc)
        setShowAiPreview(true)
      } else {
        alert('No documentation was generated')
      }
    } catch (err) {
      console.error('AI generation error:', err)
      alert(err.message || 'AI generation failed')
    } finally {
      setAiGenerating(false)
    }
  }

  // Insert AI documentation (commenters only)
  function insertAiDocumentation() {
    if (userRole !== 'commenter' || !editor || editor.isDestroyed || !aiPreview) return

    const paragraphs = aiPreview.split(/\n\n+/)
    let htmlContent = ''

    paragraphs.forEach((para) => {
      const trimmedPara = para.trim()
      if (!trimmedPara) return

      if (trimmedPara.includes('\n-') || trimmedPara.includes('\n*')) {
        const lines = trimmedPara.split('\n')
        let listHtml = '<ul>'
        let currentItem = ''

        lines.forEach(line => {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
            if (currentItem) {
              listHtml += `<li>${currentItem.trim()}</li>`
            }
            currentItem = trimmedLine.substring(1).trim()
          } else if (currentItem) {
            currentItem += ' ' + trimmedLine
          } else {
            if (trimmedLine) {
              htmlContent += `<p>${trimmedLine}</p>`
            }
          }
        })

        if (currentItem) {
          listHtml += `<li>${currentItem.trim()}</li>`
        }
        listHtml += '</ul>'
        htmlContent += listHtml
      } else if (/^\d+\./.test(trimmedPara)) {
        const lines = trimmedPara.split('\n')
        let listHtml = '<ol>'

        lines.forEach(line => {
          const trimmedLine = line.trim()
          if (/^\d+\./.test(trimmedLine)) {
            const content = trimmedLine.replace(/^\d+\.\s*/, '')
            listHtml += `<li>${content}</li>`
          }
        })

        listHtml += '</ol>'
        htmlContent += listHtml
      } else if (trimmedPara.startsWith('#')) {
        const level = trimmedPara.match(/^#+/)[0].length
        const text = trimmedPara.replace(/^#+\s*/, '')
        htmlContent += `<h${Math.min(level, 6)}>${text}</h${Math.min(level, 6)}>`
      } else {
        const paraWithBreaks = trimmedPara.replace(/\n/g, '<br>')
        htmlContent += `<p>${paraWithBreaks}</p>`
      }
    })

    editor.commands.insertContent(htmlContent)

    setHasUnsavedChanges(true)
    setStatus('unsaved')
    setShowAiPreview(false)
    setAiPreview(null)
  }

  function discardAiDocumentation() {
    setShowAiPreview(false)
    setAiPreview(null)
  }

  function handlePrint() {
    window.print()
  }

  const handleAnchorClick = useCallback((e) => {
    const link = e.target.closest('a.anchor-link')

    if (link) {
      e.preventDefault()
      e.stopPropagation()

      const href = link.getAttribute('href')

      if (href && href.includes('#anchor:')) {
        const anchorData = href.split('#anchor:')[1]
        const [file, range] = anchorData.split(':')
        const [start, end] = range.split('-').map(Number)

        if (file && file !== selectedCodeFile) {
          setSelectedCodeFile(file)
        }

        setHighlightedLines({ start, end })

        setTimeout(() => {
          const lineElement = document.querySelector(`[data-line="${start}"]`)
          if (lineElement) {
            lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
      }
    }
  }, [selectedCodeFile])

  const getCurrentFileAnchors = useCallback(() => {
    if (!selectedCodeFile || !allAnchors || allAnchors.length === 0) return []
    return allAnchors.filter(anchor => anchor.docSpan === selectedCodeFile)
  }, [selectedCodeFile, allAnchors])

  function isLineSelected(lineNum) {
    return selectedLines.start !== null && selectedLines.end !== null &&
        lineNum >= selectedLines.start && lineNum <= selectedLines.end
  }

  function isLineHighlighted(lineNum) {
    return highlightedLines.start !== null && highlightedLines.end !== null &&
        lineNum >= highlightedLines.start && lineNum <= highlightedLines.end
  }

  const groupedCodeFiles = useCallback(() => {
    const groups = {}
    const searchLower = codeFileSearchTerm.toLowerCase()

    const filteredFiles = codeFileSearchTerm
        ? codeFiles.filter(file => file.toLowerCase().includes(searchLower))
        : codeFiles

    filteredFiles.forEach(file => {
      const lastSlash = file.lastIndexOf('/')
      const directory = lastSlash > 0 ? file.substring(0, lastSlash) : '(root)'
      const fileName = lastSlash > 0 ? file.substring(lastSlash + 1) : file

      if (!groups[directory]) {
        groups[directory] = []
      }
      groups[directory].push({ fullPath: file, fileName })
    })

    const sortedGroups = Object.keys(groups).sort().reduce((acc, dir) => {
      acc[dir] = groups[dir].sort((a, b) => a.fileName.localeCompare(b.fileName))
      return acc
    }, {})

    return sortedGroups
  }, [codeFiles, codeFileSearchTerm])

  function isLineAnchored(lineNum) {
    if (!showAllAnchors) return false
    const fileAnchors = getCurrentFileAnchors()
    return fileAnchors.some(anchor =>
        lineNum >= anchor.startLine && lineNum <= anchor.endLine
    )
  }

  function getAnchorForLine(lineNum) {
    if (!showAllAnchors) return null
    const fileAnchors = getCurrentFileAnchors()
    return fileAnchors.find(anchor =>
        lineNum >= anchor.startLine && lineNum <= anchor.endLine
    )
  }

  function navigateToDocumentWithAnchor(anchor) {
    if (!anchor || !anchor.documentPath) return

    setSelectedDocPath(anchor.documentPath)
    setHighlightedLines({ start: anchor.startLine, end: anchor.endLine })

    setNavigationNotification({
      message: `📄 Jumped to documentation: ${anchor.documentPath}`,
      type: 'success'
    })

    clearTimeout(notificationTimer.current)
    notificationTimer.current = setTimeout(() => {
      setNavigationNotification(null)
    }, 3000)
  }

  const goBackToRepository = () => {
    if (repoKey) {
      navigate('/repositorypage', { state: { repoKey, repoInfo, token, userRole } })
    } else {
      navigate('/')
    }
  }

  // NEW: Toggle role
  const toggleRole = () => {
    const newRole = userRole === 'commenter' ? 'reader' : 'commenter'
    setUserRole(newRole)
    if (editor && !editor.isDestroyed) {
      editor.setEditable(newRole === 'commenter')
    }
  }

  if (!repoKey) {
    return (
        <div style={{ padding: '2rem' }}>
          <p>No repository selected.</p>
          <button onClick={goBackToRepository}>← Back to Repository</button>
        </div>
    )
  }

  if (accessChecking) {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Checking Access...</h2>
        </div>
    )
  }

  if (accessDenied) {
    return (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem' }}>🔒</div>
          <h2 style={{ color: '#dc3545' }}>Access Denied</h2>
          <button onClick={() => navigate('/')}>← Back to Home</button>
        </div>
    )
  }

  const codeLines = (codeContent || '').split('\n')

  return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              {navigationNotification.message}
            </div>
        )}

        {showAiPreview && aiPreview && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2000,
              padding: '2rem'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '800px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  padding: '1.5rem',
                  borderBottom: '1px solid #e1e4e8',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0 }}>🤖 AI-Generated Documentation</h3>
                  <button onClick={discardAiDocumentation} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
                  <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                    {aiPreview}
                  </div>
                </div>
                <div style={{ padding: '1.5rem', borderTop: '1px solid #e1e4e8', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button onClick={discardAiDocumentation} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    ❌ Discard
                  </button>
                  <button onClick={insertAiDocumentation} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    ✓ Insert
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Header */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={goBackToRepository} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ← Back
              </button>
              {/* NEW: Role toggle */}
              <button
                  onClick={toggleRole}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: userRole === 'commenter' ? '#007bff' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
              >
                {userRole === 'commenter' ? '✏️ Commenter' : '👁️ Reader'}
              </button>
              <strong>{selectedDocPath || 'No document'}</strong>
              <span style={{ fontSize: '0.9em', opacity: 0.7 }}>{repoKey} ({branch})</span>
            </div>
            <div style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {status === 'loading' ? (
                  <span>Loading…</span>
              ) : status === 'saving' ? (
                  <span>Saving…</span>
              ) : status === 'unsaved' ? (
                  <span style={{ color: '#f57c00', fontWeight: 'bold' }}>● Unsaved</span>
              ) : hasUnsavedChanges ? (
                  <span style={{ color: '#f57c00', fontWeight: 'bold' }}>● Unsaved</span>
              ) : (
                  <span style={{ color: '#28a745' }}>✓ Saved</span>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Documentation editor */}
          <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>
                  {userRole === 'commenter' ? '📝 Documentation Editor' : '📖 Documentation View'}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {userRole === 'commenter' && (
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
                            opacity: hasUnsavedChanges ? 1 : 0.6
                          }}
                      >
                        💾 Save
                      </button>
                  )}
                  <button onClick={handlePrint} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    🖨️ PDF
                  </button>
                </div>
              </div>
              <select
                  value={selectedDocPath}
                  onChange={(e) => setSelectedDocPath(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '0.5rem' }}
              >
                <option value="">Select a document...</option>
                {availableDocs.map(doc => (
                    <option key={doc.path} value={doc.path}>{doc.path}</option>
                ))}
              </select>
              {userRole === 'commenter' ? (
                  <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                    💡 Click "Create Anchor Link" after selecting code lines
                  </div>
              ) : (
                  <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                    👁️ Reader mode - Click anchor links to navigate code
                  </div>
              )}
            </div>
            <div style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
              {!selectedDocPath ? (
                  <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                    Select a document to view
                  </div>
              ) : editor ? (
                  <div onClick={handleAnchorClick}>
                    <EditorContent editor={editor} />
                  </div>
              ) : (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
              )}
            </div>
          </div>

          {/* Code viewer */}
          <div style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>💻 Code Viewer</h3>
                {userRole === 'commenter' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                          onClick={generateWithAI}
                          disabled={!selectedLines.start || aiGenerating}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: selectedLines.start ? '#007bff' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedLines.start ? 'pointer' : 'not-allowed'
                          }}
                      >
                        {aiGenerating ? 'Generating...' : '🤖 AI Doc'}
                      </button>
                      <button
                          onClick={() => setShowAnchorForm(!showAnchorForm)}
                          disabled={!selectedLines.start}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: selectedLines.start ? '#007bff' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedLines.start ? 'pointer' : 'not-allowed'
                          }}
                      >
                        🔗 Create Link
                      </button>
                    </div>
                )}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <button
                    onClick={() => setShowAllAnchors(!showAllAnchors)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: showAllAnchors ? '#28a745' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85em'
                    }}
                >
                  {showAllAnchors ? '✓ ' : ''}Show Anchors
                  {selectedCodeFile && getCurrentFileAnchors().length > 0 && (
                      <span style={{ marginLeft: '0.3rem', backgroundColor: 'rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: '10px' }}>
                    {getCurrentFileAnchors().length}
                  </span>
                  )}
                </button>
              </div>
              <input
                  type="text"
                  placeholder="🔍 Search files..."
                  value={codeFileSearchTerm}
                  onChange={(e) => setCodeFileSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '0.5rem' }}
              />
              <select
                  value={selectedCodeFile}
                  onChange={(e) => {
                    setSelectedCodeFile(e.target.value)
                    setSelectedLines({ start: null, end: null })
                    setHighlightedLines({ start: null, end: null })
                  }}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="">Select a code file...</option>
                {Object.entries(groupedCodeFiles()).map(([directory, files]) => (
                    <optgroup key={directory} label={`📁 ${directory}`}>
                      {files.map(({ fullPath, fileName }) => (
                          <option key={fullPath} value={fullPath}>{fileName}</option>
                      ))}
                    </optgroup>
                ))}
              </select>
            </div>

            {/* Anchor form (commenters only) */}
            {userRole === 'commenter' && showAnchorForm && (
                <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#e7f3ff' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>Create Anchor (Lines {selectedLines.start}-{selectedLines.end})</h4>
                  <input
                      type="text"
                      value={anchorLabel}
                      onChange={(e) => setAnchorLabel(e.target.value)}
                      placeholder="Link label"
                      onKeyPress={(e) => e.key === 'Enter' && insertAnchorLink()}
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={insertAnchorLink} style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Insert
                    </button>
                    <button onClick={() => setShowAnchorForm(false)} style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
            )}

            {/* Code display */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#f8f8f8' }}>
              {!selectedCodeFile ? (
                  <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>Select a code file</div>
              ) : codeLines.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
              ) : (
                  codeLines.map((line, i) => {
                    const lineNum = i + 1
                    const isSelected = isLineSelected(lineNum)
                    const isHighlighted = isLineHighlighted(lineNum)
                    const isAnchored = isLineAnchored(lineNum)
                    const anchorInfo = getAnchorForLine(lineNum)

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
                              if (isAnchored && anchorInfo && !e.target.closest('.line-number')) {
                                navigateToDocumentWithAnchor(anchorInfo)
                              }
                            }}
                            style={{
                              display: 'flex',
                              backgroundColor,
                              borderLeft,
                              paddingLeft,
                              cursor: isAnchored ? 'pointer' : 'default'
                            }}
                            title={isAnchored && anchorInfo ? `View in doc: ${anchorInfo.text}` : ''}
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
                          cursor: userRole === 'commenter' ? 'pointer' : 'default',
                          fontWeight: isSelected || isHighlighted || isAnchored ? 'bold' : 'normal',
                          color: isHighlighted ? '#f57c00' : isAnchored ? '#28a745' : isSelected ? '#0066cc' : '#666'
                        }}
                    >
                      {lineNum}
                      {isAnchored && anchorInfo && lineNum === anchorInfo.startLine && <span style={{ marginLeft: '4px' }}>🔗</span>}
                    </span>
                          <span style={{ whiteSpace: 'pre', flex: 1 }}>{line}</span>
                        </div>
                    )
                  })
              )}
            </div>

            {/* Info panel */}
            {selectedCodeFile && (
                <div style={{ borderTop: '1px solid #ddd', padding: '0.75rem 1rem', backgroundColor: '#f9f9f9', fontSize: '0.85em' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  <strong>Selected:</strong> {selectedLines.start && selectedLines.end ? `Lines ${selectedLines.start}-${selectedLines.end}` : 'None'}
                </span>
                    {highlightedLines.start && (
                        <button onClick={() => setHighlightedLines({ start: null, end: null })} style={{ padding: '0.25rem 0.5rem', fontSize: '0.85em' }}>
                          Clear
                        </button>
                    )}
                  </div>
                  {showAllAnchors && getCurrentFileAnchors().length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <strong>Anchors ({getCurrentFileAnchors().length}):</strong>
                        <div style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '0.5rem' }}>
                          {getCurrentFileAnchors().map((anchor, idx) => (
                              <div key={idx} style={{ marginBottom: '0.5rem', fontSize: '0.9em' }}>
                                <button
                                    onClick={() => {
                                      setHighlightedLines({ start: anchor.startLine, end: anchor.endLine })
                                      document.querySelector(`[data-line="${anchor.startLine}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#28a745', textDecoration: 'underline', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                                >
                                  Lines {anchor.startLine}-{anchor.endLine}: {anchor.text}
                                </button>
                              </div>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
            )}
          </div>
        </div>
      </div>
  )
}
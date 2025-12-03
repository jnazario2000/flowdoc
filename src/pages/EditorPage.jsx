// src/pages/EditorPage.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TipTapLink from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import { getCurrentUserId, getCurrentUser, isAuthenticated } from '../utils/authUtils.js'
import '../styles.css'

const API = import.meta.env.VITE_API_URL || ''

// Helper to determine if a file is a documentation file
function isDocFile(path) {
  if (!path) return false
  const docExtensions = ['.md', '.txt', '.doc', '.docx', '.rst', '.adoc']
  const lowerPath = path.toLowerCase()
  return docExtensions.some(ext => lowerPath.endsWith(ext)) || lowerPath.includes('/docs/')
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function markdownToSimpleHTML(md = '') {
  const safe = escapeHtml(md)
  const paras = safe.split(/\n{2,}/).map(p => p.replace(/\n/g, '<br>'))
  return `<p>${paras.join('</p><p>')}</p>`
}

// Custom bullet list that supports listStyleType
const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: null,
        parseHTML: element => element.style.listStyleType || null,
        renderHTML: attributes => {
          if (!attributes.listStyleType) return {}
          return { style: `list-style-type: ${attributes.listStyleType};` }
        },
      },
    }
  },
})

// Custom ordered list that supports listStyleType + type
const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: null,
        parseHTML: element => element.style.listStyleType || null,
        renderHTML: attributes => {
          if (!attributes.listStyleType) return {}
          return { style: `list-style-type: ${attributes.listStyleType};` }
        },
      },
    }
  },
})

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

  // User role state (commenter can edit, viewer can only view)
  const [userRole, setUserRole] = useState('viewer') // Will be set after checking permissions
  const [canEdit, setCanEdit] = useState(false) // Whether user has permission to edit

  const [documentContent, setDocumentContent] = useState(null)
  const [anchors, setAnchors] = useState([])
  const [allAnchors, setAllAnchors] = useState([])
  const [status, setStatus] = useState('loading')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [token, setToken] = useState(stateToken || null)

  // Left side documentation selector
  const [availableDocs, setAvailableDocs] = useState([])
  const [selectedDocPath, setSelectedDocPath] = useState(filePath)

  // Right side code viewer
  const [selectedCodeFile, setSelectedCodeFile] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [codeFiles, setCodeFiles] = useState([])
  const [codeFileSearchTerm, setCodeFileSearchTerm] = useState('')
  const [highlightedLines, setHighlightedLines] = useState({ start: null, end: null })
  const [showAllAnchors, setShowAllAnchors] = useState(false)

  // Anchor creation
  const [selectedLines, setSelectedLines] = useState({ start: null, end: null })
  const [showAnchorForm, setShowAnchorForm] = useState(false)
  const [anchorLabel, setAnchorLabel] = useState('')

  // AI generation
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPreview, setAiPreview] = useState(null)
  const [showAiPreview, setShowAiPreview] = useState(false)

  // Navigation notification
  const [navigationNotification, setNavigationNotification] = useState(null)

  // Access control
  const [accessDenied, setAccessDenied] = useState(false)
  const [accessChecking, setAccessChecking] = useState(true)
  const [repositoryData, setRepositoryData] = useState(null)

  // Toolbar / options
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showSettingsSub, setShowSettingsSub] = useState(false)
  const [spellcheckOn, setSpellcheckOn] = useState(true)
  const importInputRef = useRef(null)

  // list dropdown state (reset after apply)
  const [bulletSelectValue, setBulletSelectValue] = useState('')
  const [numberSelectValue, setNumberSelectValue] = useState('')

  // image input ref for local upload
  const imageInputRef = useRef(null)

  const notificationTimer = useRef(null)
  const isDoc = isDocFile(filePath)

  // UI options
  const BULLET_OPTIONS = [
    { label: '• Bullet', value: 'disc' },
    { label: '○ Hollow circle', value: 'circle' },
    { label: '■ Square', value: 'square' },
    { label: '— Dash', value: '"-  "' }, // CSS trick: custom marker still ok in most browsers
  ]

  const NUMBER_OPTIONS = [
    { label: '1. 2. 3.', value: 'decimal' },
    { label: 'a. b. c.', value: 'lower-alpha' },
    { label: 'A. B. C.', value: 'upper-alpha' },
    { label: 'i. ii. iii.', value: 'lower-roman' },
    { label: 'I. II. III.', value: 'upper-roman' },
  ]

  // TipTap editor for documentation
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      ListItem,
      StyledBulletList.configure({
        keepMarks: true,
        keepAttributes: true,
      }),
      StyledOrderedList.configure({
        keepMarks: true,
        keepAttributes: true,
      }),
      Underline,
      TipTapLink.configure({
        openOnClick: false,
        linkOnPaste: false,
        HTMLAttributes: {
          class: 'anchor-link',
          rel: 'noopener noreferrer nofollow',
          target: null,
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: userRole === 'commenter' ? 'Write your documentation here...' : 'Documentation (read-only)',
      }),
    ],
    content: documentContent,
    editable: userRole === 'commenter', // Only commenters can edit
    onUpdate: ({ editor }) => {
      if (userRole === 'commenter') {
        const json = editor.getJSON()
        setDocumentContent(json)
        setHasUnsavedChanges(true)
        setStatus('unsaved')
      }
    },
    editorProps: {
      attributes: {
        spellcheck: spellcheckOn ? 'true' : 'false',
      },
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

            if (file && file !== selectedCodeFile) setSelectedCodeFile(file)
            setHighlightedLines({ start, end })

            setTimeout(() => {
              const lineElement = document.querySelector(`[data-line="${start}"]`)
              if (lineElement) lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

  // keep spellcheck in sync after editor init
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...(editor.options.editorProps?.attributes || {}),
          spellcheck: spellcheckOn ? 'true' : 'false',
        },
      },
    })
  }, [editor, spellcheckOn])

  // Check repository access and set permissions
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
          // Not authenticated - can only view public repos
          const res = await fetch(
            `${API}/api/repositories/${encodeURIComponent(repoKey)}/access?userId=guest`
          )
          if (res.ok) {
            const data = await res.json()
            setRepositoryData(data)
            if (!data.hasAccess || !data.isPublic) {
              setAccessDenied(true)
            } else {
              // Public repo, not authenticated - viewer only
              setCanEdit(false)
              setUserRole('viewer')
            }
          } else {
            // Repository not in DB - allow viewing for legacy support
            setCanEdit(false)
            setUserRole('viewer')
          }
          setAccessChecking(false)
          return
        }
        
        const currentUser = getCurrentUser()
        const userId = currentUser._id || currentUser.id
        const res = await fetch(
          `${API}/api/repositories/${encodeURIComponent(repoKey)}/access?userId=${userId}`
        )
        
        if (res.ok) {
          const data = await res.json()
          setRepositoryData(data)
          
          if (!data.hasAccess) {
            setAccessDenied(true)
            setCanEdit(false)
            setUserRole('viewer')
          } else {
            // Check if user can edit (owner or collaborator)
            const isOwner = data.isOwner || false
            const isCollaborator = data.repository?.collaborators?.some(
              collab => collab.userId === userId
            ) || false
            
            const hasEditPermission = isOwner || isCollaborator
            setCanEdit(hasEditPermission)
            
            // Set default role: commenter if has edit permission, otherwise viewer
            const defaultRole = hasEditPermission ? 'commenter' : 'viewer'
            setUserRole(roleFromUrl || stateRole || defaultRole)
          }
        } else {
          console.warn('Repository not found in database, allowing access for legacy support')
          // Legacy support - allow editing if authenticated
          setCanEdit(true)
          setUserRole(roleFromUrl || stateRole || 'commenter')
        }
      } catch (err) {
        console.error('Error checking repository access:', err)
      } finally {
        setAccessChecking(false)
      }
    }
    checkAccess()
  }, [repoKey, roleFromUrl, stateRole])

  // Load available documentation files
  useEffect(() => {
    async function loadDocs() {
      if (!repoKey) return
      try {
        const res = await fetch(
          `${API}/api/documents/list?repoKey=${encodeURIComponent(repoKey)}`
        )
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

  // Load all anchors from all documents
  useEffect(() => {
    async function loadAllAnchors() {
      if (!repoKey || availableDocs.length === 0) return
      try {
        const allAnchorsArray = []
        for (const doc of availableDocs) {
          try {
            const res = await fetch(
              `${API}/api/documents?repoKey=${encodeURIComponent(repoKey)}&path=${encodeURIComponent(doc.path)}`
            )
            if (res.ok) {
              const data = await res.json()
              if (data.anchors && Array.isArray(data.anchors)) {
                const anchorsWithDoc = data.anchors.map(anchor => ({
                  ...anchor,
                  documentPath: doc.path,
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
        const dRes = await fetch(
          `${API}/api/documents?repoKey=${encodeURIComponent(repoKey)}&path=${encodeURIComponent(selectedDocPath)}`
        )
        const d = await dRes.json()
        const content =
          d?.content || {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: d?.body || '' }] },
            ],
          }
        setDocumentContent(content)
        setAnchors(d?.anchors || [])
        if (editor && !editor.isDestroyed) editor.commands.setContent(content)
        setStatus('ready')
      } catch (err) {
        console.error('Error loading:', err)
        setStatus('error')
      }
    }
    load()
  }, [repoKey, selectedDocPath, editor])

  // Update editor when documentContent changes
  useEffect(() => {
    if (editor && documentContent && !editor.isDestroyed) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(documentContent)) {
        editor.commands.setContent(documentContent)
      }
    }
  }, [editor, documentContent])

  // Fetch token if not in state
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
              console.log('Token retrieved from database in EditorPage')
            }
          }
        } catch (err) {
          console.error('Error fetching token:', err)
        }
      }
    }
    fetchToken()
  }, [repoKey, token])

  // Reset unsaved changes when switching docs
  useEffect(() => {
    setHasUnsavedChanges(false)
    setStatus('ready')
  }, [selectedDocPath])

  // Load available code files
  useEffect(() => {
    async function loadCodeFiles() {
      if (!repoKey) return
      try {
        const [owner, repo] = repoKey.split('/')
        const headers = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
          { headers }
        )
        if (!res.ok) {
          console.error('Error loading code files:', res.status, res.statusText)
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
        if (token) url += `&token=${encodeURIComponent(token)}`
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

  // Manual save document (commenters only)
  const saveDocument = useCallback(async () => {
    if (userRole !== 'commenter' || !hasUnsavedChanges || !documentContent) return

    setStatus('saving')
    try {
      const res = await fetch(`${API}/api/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoKey,
          path: selectedDocPath,
          content: documentContent,
        }),
      })

      if (res.ok) {
        setStatus('saved')
        setHasUnsavedChanges(false)

        // edit history tracking
        try {
          await fetch(`${API}/api/editHistories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: getCurrentUserId(),
              documentId: `${repoKey}/${selectedDocPath}`,
              repoKey,
              path: selectedDocPath,
              action: 'edit',
              changes: 'Document saved',
              newContent: JSON.stringify(documentContent).substring(0, 500),
              timestamp: new Date(),
            }),
          })
        } catch (historyErr) {
          console.error('Failed to record edit history:', historyErr)
        }

        setNavigationNotification({
          message: '✓ Document saved successfully',
          type: 'success',
        })
        clearTimeout(notificationTimer.current)
        notificationTimer.current = setTimeout(() => setNavigationNotification(null), 2000)
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

  // Keyboard shortcuts: save, redo
  useEffect(() => {
    const handleKeyDown = e => {
      if (userRole === 'commenter' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveDocument()
      }
      if (userRole === 'commenter' && e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        editor?.commands.redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveDocument, editor, userRole])

  // Handle line selection in code view (commenters only)
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

  // Insert anchor link into documentation (commenters only)
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
          docSpan: selectedCodeFile,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setAnchors(data.document?.anchors || [])

        if (data.document?.anchors) {
          setAllAnchors(prev => {
            const filtered = prev.filter(a => a.documentPath !== selectedDocPath)
            const updated = data.document.anchors.map(anchor => ({
              ...anchor,
              documentPath: selectedDocPath,
            }))
            return [...filtered, ...updated]
          })
        }

        const anchorData = `${selectedCodeFile}:${selectedLines.start}-${selectedLines.end}`
        editor
          .chain()
          .focus()
          .setLink({ href: `#anchor:${anchorData}` })
          .insertContent(anchorLabel)
          .run()

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
      alert('Please select lines first by clicking on line numbers')
      return
    }
    const codeLines = (codeContent || '').split('\n')
    const selectedCode = codeLines
      .slice(selectedLines.start - 1, selectedLines.end)
      .join('\n')

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
      alert(err.message || 'AI generation failed. Make sure GROQ_API_KEY is set.')
    } finally {
      setAiGenerating(false)
    }
  }

  function insertAiDocumentation() {
    if (userRole !== 'commenter' || !editor || editor.isDestroyed || !aiPreview) return
    
    if (editor && !editor.isDestroyed && aiPreview) {
      const paragraphs = aiPreview.split(/\n\n+/)
      let htmlContent = ''

      paragraphs.forEach(para => {
        const trimmedPara = para.trim()
        if (!trimmedPara) return

        if (trimmedPara.includes('\n-') || trimmedPara.includes('\n*')) {
          const lines = trimmedPara.split('\n')
          let listHtml = '<ul>'
          let currentItem = ''

          lines.forEach(line => {
            const trimmedLine = line.trim()
            if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
              if (currentItem) listHtml += `<li>${currentItem.trim()}</li>`
              currentItem = trimmedLine.substring(1).trim()
            } else if (currentItem) {
              currentItem += ' ' + trimmedLine
            } else if (trimmedLine) {
              htmlContent += `<p>${trimmedLine}</p>`
            }
          })

          if (currentItem) listHtml += `<li>${currentItem.trim()}</li>`
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
  }

  function discardAiDocumentation() {
    setShowAiPreview(false)
    setAiPreview(null)
  }

  function handlePrint() {
    window.print()
  }

  const handleAnchorClick = useCallback(
    e => {
      const link = e.target.closest('a.anchor-link')
      if (link) {
        e.preventDefault()
        e.stopPropagation()
        const href = link.getAttribute('href')
        if (href && href.includes('#anchor:')) {
          const anchorData = href.split('#anchor:')[1]
          const [file, range] = anchorData.split(':')
          const [start, end] = range.split('-').map(Number)

          if (file && file !== selectedCodeFile) setSelectedCodeFile(file)
          setHighlightedLines({ start, end })

          setTimeout(() => {
            const lineElement = document.querySelector(`[data-line="${start}"]`)
            if (lineElement) lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 300)
        }
      }
    },
    [selectedCodeFile]
  )

  const getCurrentFileAnchors = useCallback(() => {
    if (!selectedCodeFile || !allAnchors || allAnchors.length === 0) return []
    return allAnchors.filter(anchor => anchor.docSpan === selectedCodeFile)
  }, [selectedCodeFile, allAnchors])

  function isLineSelected(lineNum) {
    return (
      selectedLines.start !== null &&
      selectedLines.end !== null &&
      lineNum >= selectedLines.start &&
      lineNum <= selectedLines.end
    )
  }

  function isLineHighlighted(lineNum) {
    return (
      highlightedLines.start !== null &&
      highlightedLines.end !== null &&
      lineNum >= highlightedLines.start &&
      lineNum <= highlightedLines.end
    )
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
      if (!groups[directory]) groups[directory] = []
      groups[directory].push({ fullPath: file, fileName })
    })

    return Object.keys(groups)
      .sort()
      .reduce((acc, dir) => {
        acc[dir] = groups[dir].sort((a, b) => a.fileName.localeCompare(b.fileName))
        return acc
      }, {})
  }, [codeFiles, codeFileSearchTerm])

  function isLineAnchored(lineNum) {
    if (!showAllAnchors) return false
    const fileAnchors = getCurrentFileAnchors()
    return fileAnchors.some(anchor => lineNum >= anchor.startLine && lineNum <= anchor.endLine)
  }

  function getAnchorForLine(lineNum) {
    if (!showAllAnchors) return null
    const fileAnchors = getCurrentFileAnchors()
    return fileAnchors.find(anchor => lineNum >= anchor.startLine && lineNum <= anchor.endLine)
  }

  function navigateToDocumentWithAnchor(anchor) {
    if (!anchor || !anchor.documentPath) return
    setSelectedDocPath(anchor.documentPath)
    setHighlightedLines({ start: anchor.startLine, end: anchor.endLine })
    setNavigationNotification({
      message: `📄 Jumped to documentation: ${anchor.documentPath}`,
      type: 'success',
    })
    clearTimeout(notificationTimer.current)
    notificationTimer.current = setTimeout(() => setNavigationNotification(null), 3000)
  }

  const goBackToRepository = () => {
    if (repoKey) navigate('/repositorypage', { state: { repoKey, repoInfo, token, userRole } })
    else navigate('/')
  }

  // Toggle between commenter and viewer roles (only if user has edit permission)
  const toggleRole = () => {
    if (!canEdit) {
      setNavigationNotification({
        message: '⚠️ You need to be invited as an editor to make changes',
        type: 'warning'
      })
      clearTimeout(notificationTimer.current)
      notificationTimer.current = setTimeout(() => setNavigationNotification(null), 3000)
      return
    }
    
    const newRole = userRole === 'commenter' ? 'viewer' : 'commenter'
    setUserRole(newRole)
    if (editor && !editor.isDestroyed) {
      editor.setEditable(newRole === 'commenter')
    }
  }

  // -------- Toolbar actions --------
  const toolbarBtnStyle = isActive => ({
    padding: '0.35rem 0.55rem',
    border: '1px solid #ccc',
    backgroundColor: isActive ? '#e9f2ff' : 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85em',
    lineHeight: 1,
  })

  // Local image upload
  function triggerLocalImagePick() {
    imageInputRef.current?.click()
  }

  function onLocalImagePicked(e) {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result || '')
      if (!src) return
      editor.chain().focus().setImage({ src }).run()
      setHasUnsavedChanges(true)
      setStatus('unsaved')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Image from URL
  function promptAndInsertImageFromUrl() {
    if (!editor) return
    const url = window.prompt('Paste image URL')
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
    setHasUnsavedChanges(true)
    setStatus('unsaved')
  }

  // Proper list behavior like Word:
  // Apply list to all selected paragraphs + continue numbering on Enter.
  function applyBulletStyle(listStyleType) {
    if (!editor) return
    editor
      .chain()
      .focus()
      .toggleBulletList()
      .updateAttributes('bulletList', { listStyleType })
      .run()
    setHasUnsavedChanges(true)
    setStatus('unsaved')
  }

  function applyNumberStyle(listStyleType) {
    if (!editor) return
    editor
      .chain()
      .focus()
      .toggleOrderedList()
      .updateAttributes('orderedList', { listStyleType })
      .run()
    setHasUnsavedChanges(true)
    setStatus('unsaved')
  }

  // Download .md (simple text export)
  function downloadMarkdown() {
    if (!editor) return
    const text = editor.getText({ blockSeparator: '\n\n' })
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const nameFromPath = (selectedDocPath || 'document').split('/').pop()
    a.href = url
    a.download = nameFromPath.endsWith('.md') ? nameFromPath : `${nameFromPath}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setShowOptionsMenu(false)
  }

  // Import .md
  function onImportFilePicked(e) {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      const md = String(reader.result || '')
      const html = markdownToSimpleHTML(md)
      editor.commands.setContent(html)
      setDocumentContent(editor.getJSON())
      setHasUnsavedChanges(true)
      setStatus('unsaved')
    }
    reader.readAsText(file)
    e.target.value = ''
    setShowOptionsMenu(false)
  }

  function exportHtml() {
    if (!editor) return
    const html = editor.getHTML()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const nameFromPath = (selectedDocPath || 'document').split('/').pop()
    a.href = url
    a.download = `${nameFromPath}.html`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setShowOptionsMenu(false)
  }

  // close options if click outside
  useEffect(() => {
    if (!showOptionsMenu) return
    const onClick = e => {
      const menu = document.getElementById('options-menu')
      const btn = document.getElementById('options-btn')
      if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
        setShowOptionsMenu(false)
        setShowSettingsSub(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [showOptionsMenu])

  if (!repoKey) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>No repository selected. Please select a repository.</p>
        <button
          onClick={goBackToRepository}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ← Back to Repository
        </button>
      </div>
    )
  }

  if (accessChecking) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Checking Access...</h2>
        <p>Verifying your permissions for this repository...</p>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Access Denied</h2>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
          {repositoryData?.repository?.isPrivate
            ? "This is a private repository. You don't have permission to access it."
            : 'You need to be signed in to access this repository.'}
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
              marginRight: '1rem',
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
            marginTop: '1rem',
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
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: navigationNotification.type === 'success' 
              ? '#28a745' 
              : navigationNotification.type === 'warning'
              ? '#ffc107'
              : '#007bff',
            color: navigationNotification.type === 'warning' ? '#000' : 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '0.95em',
            fontWeight: '500',
            animation: 'slideDown 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
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
              lineHeight: '1',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* AI Preview Modal */}
      {showAiPreview && aiPreview && (
        <div
          style={{
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
            padding: '2rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e1e4e8',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f6f8fa',
              }}
            >
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🤖 AI-Generated Documentation Preview
              </h3>
              <button
                onClick={discardAiDocumentation}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5em',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#666',
                  lineHeight: '1',
                }}
                title="Close preview"
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '1.5rem',
                backgroundColor: '#fff',
              }}
            >
              <div
                style={{
                  backgroundColor: '#f9f9f9',
                  border: '1px solid #e1e4e8',
                  borderRadius: '6px',
                  padding: '1.5rem',
                  fontSize: '0.95em',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {aiPreview}
              </div>
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderTop: '1px solid #e1e4e8',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f6f8fa',
                gap: '1rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.85em', color: '#666', flex: 1 }}>
                💡 Review the AI-generated content. Click "Insert" to add it to your documentation,
                or "Discard" to cancel.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={discardAiDocumentation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                  }}
                >
                  ❌ Discard
                </button>
                <button
                  onClick={insertAiDocumentation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                  }}
                >
                  ✓ Insert into Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={goBackToRepository}
              style={{
                padding: '0.4rem 0.8rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9em',
              }}
            >
              ← Back to Repository
            </button>
            <button
              onClick={toggleRole}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: canEdit 
                  ? (userRole === 'commenter' ? '#007bff' : '#28a745')
                  : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: canEdit ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                fontSize: '0.9em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                opacity: canEdit ? 1 : 0.7,
              }}
              title={canEdit 
                ? `Switch to ${userRole === 'commenter' ? 'viewer' : 'commenter'} mode`
                : 'You need to be invited as an editor to make changes'
              }
            >
              {canEdit 
                ? (userRole === 'commenter' ? '✏️ Commenter Mode' : '👁️ Viewer Mode')
                : '👁️ Viewer Mode (Read-Only)'
              }
            </button>
            <strong>{selectedDocPath || 'No document selected'}</strong>
            <span style={{ fontSize: '0.9em', opacity: 0.7 }}>
              {repoKey} ({branch})
            </span>
          </div>
          <div
            style={{
              fontSize: '0.9em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
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
        <div
          className="doc-editor-panel"
          style={{
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #ddd',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
            {/* Title + Save/Export + Options */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>
                {userRole === 'commenter' ? 'Documentation Editor' : 'Documentation Viewer'}
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}>
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
                      fontSize: '0.9em',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      opacity: hasUnsavedChanges ? 1 : 0.6,
                      transition: 'all 0.2s ease',
                    }}
                    title={hasUnsavedChanges ? 'Save changes (Ctrl+S / Cmd+S)' : 'No unsaved changes'}
                  >
                    💾 Save
                    {hasUnsavedChanges && <span style={{ fontSize: '1.2em' }}>●</span>}
                  </button>
                )}

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
                    gap: '0.3rem',
                  }}
                  title="Print or export as PDF"
                >
                  🖨️ Export PDF
                </button>

                {/* Options (…) - Only for commenters */}
                {userRole === 'commenter' && (
                  <button
                    id="options-btn"
                    onClick={() => setShowOptionsMenu(v => !v)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      border: '1px solid #ccc',
                      backgroundColor: showOptionsMenu ? '#eee' : 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '1.1em',
                      lineHeight: 1,
                    }}
                    title="More options"
                  >
                    ⋯
                  </button>
                )}

                {showOptionsMenu && (
                  <div
                    id="options-menu"
                    style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                      minWidth: '220px',
                      zIndex: 50,
                      padding: '0.35rem',
                    }}
                  >
                    <button
                      onClick={() => importInputRef.current?.click()}
                      style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      Import .md
                    </button>
                    <button
                      onClick={downloadMarkdown}
                      style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      Download .md
                    </button>
                    <button
                      onClick={() => {
                        setSpellcheckOn(v => !v)
                        setShowOptionsMenu(false)
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      Spellcheck {spellcheckOn ? 'On' : 'Off'}
                    </button>
                    <button
                      onClick={() => {
                        editor?.chain().focus().unsetAllMarks().clearNodes().run()
                        setHasUnsavedChanges(true)
                        setStatus('unsaved')
                        setShowOptionsMenu(false)
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      Clear formatting
                    </button>

                    <button
                      onClick={exportHtml}
                      style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      Export HTML
                    </button>

              

                 

                    {showSettingsSub && (
                      <div style={{ paddingLeft: '0.5rem' }}>
                        <button
                          onClick={() => alert('Settings placeholder — add theme, autosave, font size, etc. here.')}
                          style={{ width: '100%', textAlign: 'left', padding: '0.35rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9em', color: '#555' }}
                        >
                          Editor settings
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={importInputRef}
                  type="file"
                  accept=".md,text/markdown"
                  style={{ display: 'none' }}
                  onChange={onImportFilePicked}
                />
              </div>
            </div>

            {/* Toolbar row - Only for commenters */}
            {userRole === 'commenter' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.6rem', alignItems: 'center' }}>
                {/* Undo / Redo */}
                <button
                  style={toolbarBtnStyle(false)}
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo()}
                  title="Undo (Ctrl+Z)"
                >
                  ↶
                </button>
              <button
                style={toolbarBtnStyle(false)}
                onClick={() => editor?.chain().focus().redo().run()}
                disabled={!editor?.can().redo()}
                title="Redo (Ctrl+Y)"
              >
                ↷
              </button>

              {/* Marks */}
              <button
                style={toolbarBtnStyle(editor?.isActive('bold'))}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                title="Bold"
              >
                B
              </button>
              <button
                style={toolbarBtnStyle(editor?.isActive('italic'))}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                title="Italic"
              >
                I
              </button>
              <button
                style={toolbarBtnStyle(editor?.isActive('underline'))}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                title="Underline"
              >
                U
              </button>
              <button
                style={toolbarBtnStyle(editor?.isActive('strike'))}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                title="Strikethrough"
              >
                S
              </button>

              {/* Headings */}
              <button
                style={toolbarBtnStyle(editor?.isActive('heading', { level: 1 }))}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                title="Heading 1"
              >
                H1
              </button>
              <button
                style={toolbarBtnStyle(editor?.isActive('heading', { level: 2 }))}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                title="Heading 2"
              >
                H2
              </button>

              {/* Lists / Quote */}
            
          
              <button
                style={toolbarBtnStyle(editor?.isActive('blockquote'))}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                title="Blockquote"
              >
                “ ”
              </button>

              {/* Alignment */}
              <button
                style={toolbarBtnStyle(editor?.isActive({ textAlign: 'left' }))}
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                title="Align left"
              >
                L
              </button>
              <button
                style={toolbarBtnStyle(editor?.isActive({ textAlign: 'center' }))}
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                title="Align center"
              >
                C
              </button>
              <button
                style={toolbarBtnStyle(editor?.isActive({ textAlign: 'right' }))}
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                title="Align right"
              >
                R
              </button>
              <button
                style={toolbarBtnStyle(editor?.isActive({ textAlign: 'justify' }))}
                onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                title="Justify"
              >
                J
              </button>

              {/* Bullet styles dropdown */}
              <select
                value={bulletSelectValue}
                onChange={e => {
                  const val = e.target.value
                  if (val) applyBulletStyle(val)
                  setBulletSelectValue('')
                }}
                style={{
                  padding: '0.32rem 0.45rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                  background: 'white',
                  cursor: 'pointer',
                }}
                title="Bullet styles"
              >
                <option value="">Bullets ▼</option>
                {BULLET_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Numbering styles dropdown */}
              <select
                value={numberSelectValue}
                onChange={e => {
                  const val = e.target.value
                  if (val) applyNumberStyle(val)
                  setNumberSelectValue('')
                }}
                style={{
                  padding: '0.32rem 0.45rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                  background: 'white',
                  cursor: 'pointer',
                }}
                title="Numbered styles"
              >
                <option value="">Numbering ▼</option>
                {NUMBER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Insertions */}
              <button
                style={toolbarBtnStyle(false)}
                onClick={triggerLocalImagePick}
                title="Insert image from device"
              >
                🖼️
              </button>
              <button
                style={toolbarBtnStyle(false)}
                onClick={promptAndInsertImageFromUrl}
                title="Insert image from URL"
              >
                🌐
              </button>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onLocalImagePicked}
              />
              </div>
            )}

            {/* Doc selector */}
            <select
              value={selectedDocPath}
              onChange={e => setSelectedDocPath(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontSize: '0.9em',
                marginBottom: '0.5rem',
              }}
            >
              <option value="">Select a document...</option>
              {availableDocs.map(doc => (
                <option key={doc.path} value={doc.path}>
                  {doc.path}
                </option>
              ))}
            </select>

            <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
              {userRole === 'commenter' ? (
                <>
                  <p style={{ margin: '0 0 0.25rem 0' }}>
                    💡 Click "Create Anchor Link" after selecting code lines on the right
                  </p>
                  <p style={{ margin: 0, fontStyle: 'italic' }}>
                    Press Ctrl+S (or Cmd+S) to save your changes
                  </p>
                </>
              ) : (
                <p style={{ margin: 0 }}>
                  👁️ Viewer mode - Click anchor links to navigate code
                </p>
              )}
            </div>
          </div>

          <div style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
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
          <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Code Viewer</h3>
              {userRole === 'commenter' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={`link-btn ai-btn ${aiGenerating ? 'disabled' : ''}`}
                    onClick={generateWithAI}
                    disabled={!selectedLines.start || !selectedLines.end || aiGenerating}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9em' }}
                  >
                    {aiGenerating ? 'Generating...' : 'Generate AI Documentation'}
                  </button>
                  <button
                    onClick={() => {
                      if (selectedLines.start) setShowAnchorForm(!showAnchorForm)
                      else alert('Select lines first (shift-click for range)')
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: selectedLines.start ? '#007bff' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: selectedLines.start ? 'pointer' : 'not-allowed',
                      fontSize: '0.9em',
                    }}
                  >
                    🔗 Create Anchor Link
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowAllAnchors(!showAllAnchors)
                  if (!showAllAnchors) setHighlightedLines({ start: null, end: null })
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
                  gap: '0.3rem',
                }}
                title={showAllAnchors ? 'Hide all anchors' : 'Show all anchors in this file'}
              >
                {showAllAnchors ? '✓ ' : ''}Show All Anchors
                {selectedCodeFile && getCurrentFileAnchors().length > 0 && (
                  <span
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '0.9em',
                      fontWeight: 'bold',
                    }}
                  >
                    {getCurrentFileAnchors().length}
                  </span>
                )}
              </button>
            </div>

            <input
              type="text"
              placeholder="Search files..."
              value={codeFileSearchTerm}
              onChange={e => setCodeFileSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginBottom: '0.5rem',
                fontSize: '0.9em',
              }}
            />

            <select
              value={selectedCodeFile}
              onChange={e => {
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
                fontSize: '0.9em',
              }}
            >
              <option value="">Select a code file...</option>
              {Object.entries(groupedCodeFiles()).map(([directory, files]) => (
                <optgroup key={directory} label={`📁 ${directory}`}>
                  {files.map(({ fullPath, fileName }) => (
                    <option key={fullPath} value={fullPath}>
                      {fileName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Anchor creation form - Only for commenters */}
          {userRole === 'commenter' && showAnchorForm && (
            <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#e7f3ff' }}>
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
                  onChange={e => setAnchorLabel(e.target.value)}
                  placeholder="e.g., 'authentication logic' or 'API endpoint'"
                  onKeyPress={e => e.key === 'Enter' && insertAnchorLink()}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '0.9em',
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
                    fontSize: '0.9em',
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
                    fontSize: '0.9em',
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
          <div style={{ flex: 1, overflow: 'auto', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#f8f8f8' }}>
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

                let backgroundColor = 'transparent'
                let borderLeft = 'none'
                let paddingLeft = '1rem'

                if (isHighlighted) {
                  backgroundColor = '#fff3b0'
                  borderLeft = '4px solid #ffc107'
                  paddingLeft = '1rem'
                } else if (isAnchored) {
                  backgroundColor = '#d4f4dd'
                  borderLeft = '4px solid #28a745'
                  paddingLeft = '1rem'
                } else if (isSelected) {
                  backgroundColor = '#d4e9ff'
                  borderLeft = '3px solid #007bff'
                  paddingLeft = '1rem'
                }

                return (
                  <div
                    key={i}
                    data-line={lineNum}
                    onClick={e => {
                      if (isAnchored && anchorInfo && !e.target.closest('.line-number')) {
                        navigateToDocumentWithAnchor(anchorInfo)
                      }
                    }}
                    style={{
                      display: 'flex',
                      backgroundColor,
                      borderLeft,
                      paddingLeft: paddingLeft || '1rem',
                      paddingRight: '1rem',
                      paddingTop: '0.15rem',
                      paddingBottom: '0.15rem',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      cursor: isAnchored ? 'pointer' : 'default',
                      minHeight: '1.5em',
                      minWidth: '100%',
                    }}
                    title={isAnchored && anchorInfo ? `Click to view in documentation: ${anchorInfo.text} (${anchorInfo.documentPath})` : ''}
                  >
                    <span
                      className="line-number"
                      onClick={e => {
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
                        color: isHighlighted ? '#f57c00' : isAnchored ? '#28a745' : isSelected ? '#0066cc' : '#666',
                        flexShrink: 0,
                      }}
                    >
                      {lineNum}
                      {isAnchored && anchorInfo && lineNum === anchorInfo.startLine && (
                        <span style={{ marginLeft: '4px', fontSize: '0.8em', color: '#28a745' }}>🔗</span>
                      )}
                    </span>
                    <span style={{ whiteSpace: 'pre', display: 'inline-block', minWidth: 'max-content' }}>
                      {line}
                      {isAnchored && anchorInfo && lineNum === anchorInfo.startLine && (
                        <span
                          style={{
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
                            pointerEvents: 'none',
                          }}
                        >
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
            <div style={{ borderTop: '1px solid #ddd', padding: '0.75rem 1rem', backgroundColor: '#f9f9f9', fontSize: '0.85em' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <strong>Selected:</strong>{' '}
                  {selectedLines.start && selectedLines.end ? `Lines ${selectedLines.start}-${selectedLines.end}` : 'None'}
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
                      cursor: 'pointer',
                    }}
                  >
                    Clear Highlight
                  </button>
                )}
              </div>

              {showAllAnchors && getCurrentFileAnchors().length > 0 ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#e7f3e9',
                      borderRadius: '4px',
                      border: '1px solid #28a745',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '20px', height: '3px', backgroundColor: '#28a745', display: 'inline-block' }} />
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
                              if (lineElement) lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#28a745',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '0.9em',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{ fontWeight: 'bold' }}>
                              Lines {anchor.startLine}-{anchor.endLine}: {anchor.text}
                            </div>
                            {anchor.documentPath && (
                              <div style={{ fontSize: '0.85em', color: '#6c757d', fontStyle: 'italic', marginTop: '2px' }}>
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
                  {userRole === 'commenter' 
                    ? 'Click line numbers to select (Shift+Click for range)' 
                    : 'Click green-highlighted code to view documentation'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
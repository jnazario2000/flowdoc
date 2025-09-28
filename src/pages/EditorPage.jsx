// src/pages/EditorPage.jsx
import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function EditorPage() {
  const { projectId } = useParams()
  const [sp] = useSearchParams()
  const filePath = sp.get('path') || ''
  const [code, setCode] = useState('')
  const [doc, setDoc] = useState('')
  const [status, setStatus] = useState('ready')
  const timer = useRef(null)

  useEffect(() => {
    async function load() {
      if (!projectId || !filePath) return
      const [fRes, dRes] = await Promise.all([
        fetch(`${API}/api/files?projectId=${projectId}&path=${encodeURIComponent(filePath)}`),
        fetch(`${API}/api/documents?projectId=${projectId}&path=${encodeURIComponent(filePath)}`)
      ])
      const f = await fRes.json()
      const d = await dRes.json()
      setCode(f?.content || '')
      setDoc(d?.content || '')
    }
    load()
  }, [projectId, filePath])

  function onChange(e) {
    const v = e.target.value
    setDoc(v)
    setStatus('dirty')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setStatus('saving')
      const res = await fetch(`${API}/api/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, path: filePath, content: v })
      })
      setStatus(res.ok ? 'saved' : 'error')
    }, 900)
  }

  if (!filePath) return <div style={{padding:20}}>No file selected.</div>

  return (
    <div className="flex gap-4 p-4">
      <div className="w-1/2 flex flex-col">
        <div className="text-sm opacity-70 mb-2">
          {filePath} — {status === 'saving' ? 'Saving…' : status === 'dirty' ? 'Unsaved changes' : status === 'error' ? 'Save failed' : 'All changes saved'}
        </div>
        <textarea className="w-full h-[80vh] p-3 border rounded" value={doc} onChange={onChange} />
      </div>
      <div className="w-1/2">
        <pre className="w-full h-[80vh] p-3 border rounded overflow-auto">
          {(code || '').split('\n').map((ln, i) => (
            <div key={i} className="whitespace-pre">
              <span className="opacity-60 mr-3 select-none">{String(i+1).padStart(4, ' ')}</span>
              {ln}
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}

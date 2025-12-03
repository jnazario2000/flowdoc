const BASE = import.meta.env.VITE_API_URL || '';

async function jfetch(url, opts) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('API error', res.status, text);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

async function ensureDocument(docId, initial) {
  try {
    return await jfetch(`${BASE}/api/documents/${docId}`, { method: 'GET' });
  } catch {
    return await jfetch(`${BASE}/api/documents`, {
      method: 'POST',
      body: JSON.stringify({ docId, ...initial }),
    });
  }
}

async function updateDocument(docId, patch) {
  return jfetch(`${BASE}/api/documents/${docId}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

async function listThreads(docId) {
  return jfetch(`${BASE}/api/threads?docId=${encodeURIComponent(docId)}`);
}

async function createThread(payload) {
  return jfetch(`${BASE}/api/threads`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function addComment(threadId, payload) {
  return jfetch(`${BASE}/api/threads/${threadId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const editorApi = {
  ensureDocument,
  updateDocument,
  listThreads,
  createThread,
  addComment,
};

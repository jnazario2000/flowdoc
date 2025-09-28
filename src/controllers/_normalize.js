// Clean up GitHub paths and URLs
export function sanitizePath(p) {
  if (!p) return p;

  // If someone pasted a full GitHub URL, pull out just the file path after "blob/branch/" or "tree/branch/"
  const full = p.match(/github\.com\/[^/]+\/[^/]+\/(?:blob|tree)\/[^/]+\/(.+)/i);
  if (full) p = full[1];

  // Remove leading slashes and extra "blob/<branch>/" or "tree/<branch>/"
  p = p.replace(/^\/+/, '');
  p = p.replace(/^blob\/[^/]+\/+/, '');
  p = p.replace(/^tree\/[^/]+\/+/, '');

  return p;
}

// Make sure repo info is always "owner/repo" and clean the path
export function normalizeRepoAndPath(repoKey, path) {
  let rk = repoKey || '';
  let p  = sanitizePath(path || '');

  // If repoKey is just "owner", upgrade it to "owner/repo"
  if (rk && !rk.includes('/')) {
    const segs = p.split('/');
    if (segs.length > 1) {
      rk = `${rk}/${segs[0]}`;
      p  = segs.slice(1).join('/');
    }
  }
  return { repoKey: rk, path: p };
}

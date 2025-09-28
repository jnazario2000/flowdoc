// If only a repo name is given, try to find the matching "owner/repo"
export async function resolveOwnerRepo(repoKey) {
  if (!repoKey || repoKey.includes('/')) return repoKey;

  // Look in DB for repos that end with this name
  const matches = await state.files.distinct('repoKey', {
    repoKey: new RegExp(`/${repoKey}$`)
  });

  // Only return if it’s unique; otherwise don’t guess
  if (matches.length === 1) return matches[0];
  return repoKey;
}

export async function seedFile(req, res) {
  const { repoKey, path, content } = req.body || {};
  if (!repoKey || !path) return res.status(400).json({ error: "repoKey and path required" });

  // Default text if nothing provided
  const text = content ?? "# seeded demo\n";

  // Save into DB, create if missing
  const r = await state.files.updateOne(
    { repoKey, path },
    { $set: { content: text, size: text.length, seededAt: new Date() } },
    { upsert: true }
  );

  res.json({ ok: true, upserted: r.upsertedId || null, matched: r.matchedCount });
}

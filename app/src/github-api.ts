import type { Settings, FileState, SyncMeta } from './types'

const BASE = 'https://api.github.com'

function headers(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

export interface AuthResult {
  ok: boolean;
  message: string;
  rateRemaining?: number;
}

export async function testAuth(s: Settings): Promise<AuthResult> {
  try {
    const [userRes, repoRes] = await Promise.all([
      fetch(`${BASE}/user`, { headers: headers(s.pat) }),
      fetch(`${BASE}/repos/${s.owner}/${s.repo}`, { headers: headers(s.pat) }),
    ])
    const remaining = parseInt(userRes.headers.get('x-ratelimit-remaining') ?? '0', 10)
    if (userRes.status === 401) return { ok: false, message: 'Invalid token — check your PAT.' }
    if (repoRes.status === 404) return { ok: false, message: `Repo ${s.owner}/${s.repo} not found or not accessible.` }
    if (!userRes.ok || !repoRes.ok) return { ok: false, message: `Unexpected error (${userRes.status}, ${repoRes.status}).` }
    const user = await userRes.json()
    return { ok: true, message: `Connected as ${user.login}`, rateRemaining: remaining }
  } catch {
    return { ok: false, message: 'Network error — check your connection.' }
  }
}

export async function getFile<T>(s: Settings, path: string): Promise<FileState<T>> {
  const url = `${BASE}/repos/${s.owner}/${s.repo}/contents/${path}?ref=${encodeURIComponent(s.branch)}`
  const res = await fetch(url, { headers: headers(s.pat) })
  if (res.status === 404) throw new Error(`File not found: ${path}`)
  if (!res.ok) throw new Error(`GitHub API error ${res.status} fetching ${path}`)
  const json = await res.json()
  const content = atob(json.content.replace(/\n/g, ''))
  const data: T = JSON.parse(content)
  return { data, sha: json.sha, fetchedAt: Date.now() }
}

export async function putFile<T extends { _sync?: SyncMeta }>(
  s: Settings,
  path: string,
  data: T,
  sha: string,
  message: string
): Promise<{ sha: string }> {
  // Stamp sync metadata before writing
  const payload: T = {
    ...data,
    _sync: {
      source_md: data._sync?.source_md ?? path.replace('data/', '').replace('.json', '.md'),
      last_synced: new Date().toISOString(),
      md_hash: null, // MD is now stale — agent will regenerate at next session
    },
  }
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))))
  const url = `${BASE}/repos/${s.owner}/${s.repo}/contents/${path}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: headers(s.pat),
    body: JSON.stringify({ message, content, sha, branch: s.branch }),
  })
  if (res.status === 409) throw new Error('Conflict: file changed on GitHub since last fetch. Reload and try again.')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`GitHub API error ${res.status}: ${err.message ?? 'unknown'}`)
  }
  const result = await res.json()
  return { sha: result.content.sha }
}

export function rawImageUrl(s: Settings, filename: string): string {
  return `https://raw.githubusercontent.com/${s.owner}/${s.repo}/refs/heads/${s.branch}/images/${filename}`
}

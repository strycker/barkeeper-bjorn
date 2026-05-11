import type { FileState, InventoryData, ProfileData, RecipesData, BarkeeperData, Settings } from './types'

export const STORAGE_KEYS = {
  owner: 'bjorn_owner',
  repo: 'bjorn_repo',
  branch: 'bjorn_branch',
  pat: 'bjorn_pat',
} as const

export function loadSettings(): Settings {
  return {
    owner: localStorage.getItem(STORAGE_KEYS.owner) ?? '',
    repo: localStorage.getItem(STORAGE_KEYS.repo) ?? '',
    branch: localStorage.getItem(STORAGE_KEYS.branch) ?? 'main',
    pat: localStorage.getItem(STORAGE_KEYS.pat) ?? '',
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(STORAGE_KEYS.owner, s.owner)
  localStorage.setItem(STORAGE_KEYS.repo, s.repo)
  localStorage.setItem(STORAGE_KEYS.branch, s.branch)
  localStorage.setItem(STORAGE_KEYS.pat, s.pat)
}

export function hasSettings(): boolean {
  const s = loadSettings()
  return !!(s.owner && s.repo && s.pat)
}

export const appState = {
  inventory: null as FileState<InventoryData> | null,
  profile: null as FileState<ProfileData> | null,
  recipes: null as FileState<RecipesData> | null,
  barkeeper: null as FileState<BarkeeperData> | null,
}

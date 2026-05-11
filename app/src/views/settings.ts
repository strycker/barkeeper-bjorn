import { loadSettings, saveSettings } from '../state'
import { testAuth } from '../github-api'
import type { Settings } from '../types'

export function renderSettings(container: HTMLElement, onConnected?: () => void): void {
  const s = loadSettings()

  container.innerHTML = `
    <div class="view-header">
      <h1>Settings</h1>
      <p class="subtitle">Connect Barkeeper Bjorn to your GitHub repository.</p>
    </div>

    <div class="settings-card">
      <div class="security-note">
        <span class="security-icon">⚠</span>
        <span>Your PAT is stored in your browser's <code>localStorage</code>. Use a token scoped to <strong>repo (read/write)</strong> only.
        Never use a token with write access to sensitive repos. Revoke and regenerate tokens regularly.
        This app is designed for personal use on a trusted device.</span>
      </div>

      <form id="settings-form">
        <div class="field-group">
          <label for="owner">GitHub Username / Owner</label>
          <input id="owner" type="text" value="${s.owner}" placeholder="e.g. strycker" autocomplete="off" spellcheck="false" />
        </div>
        <div class="field-group">
          <label for="repo">Repository Name</label>
          <input id="repo" type="text" value="${s.repo}" placeholder="e.g. barkeeper-bjorn" autocomplete="off" spellcheck="false" />
        </div>
        <div class="field-group">
          <label for="branch">Branch</label>
          <input id="branch" type="text" value="${s.branch}" placeholder="main" autocomplete="off" spellcheck="false" />
        </div>
        <div class="field-group">
          <label for="pat">Personal Access Token</label>
          <input id="pat" type="password" value="${s.pat}" placeholder="ghp_..." autocomplete="off" spellcheck="false" />
          <span class="field-hint">Requires <code>repo</code> scope (Contents: read &amp; write).</span>
        </div>

        <div class="settings-actions">
          <button type="submit" class="btn-primary">Save &amp; Test Connection</button>
          <span id="auth-status" class="auth-status"></span>
        </div>
      </form>

      <div class="pat-help">
        <strong>How to get a token:</strong>
        GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens →
        Generate new token → Select your fork → Repository permissions → Contents: Read and write.
      </div>
    </div>
  `

  const form = container.querySelector('#settings-form') as HTMLFormElement
  const statusEl = container.querySelector('#auth-status') as HTMLElement

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const newSettings: Settings = {
      owner: (container.querySelector('#owner') as HTMLInputElement).value.trim(),
      repo: (container.querySelector('#repo') as HTMLInputElement).value.trim(),
      branch: (container.querySelector('#branch') as HTMLInputElement).value.trim() || 'main',
      pat: (container.querySelector('#pat') as HTMLInputElement).value.trim(),
    }
    if (!newSettings.owner || !newSettings.repo || !newSettings.pat) {
      statusEl.textContent = 'Please fill in all fields.'
      statusEl.className = 'auth-status error'
      return
    }
    saveSettings(newSettings)
    statusEl.textContent = 'Testing connection…'
    statusEl.className = 'auth-status pending'
    const result = await testAuth(newSettings)
    if (result.ok) {
      statusEl.textContent = `✓ ${result.message}${result.rateRemaining !== undefined ? ` · ${result.rateRemaining} API calls remaining` : ''}`
      statusEl.className = 'auth-status success'
      onConnected?.()
    } else {
      statusEl.textContent = `✗ ${result.message}`
      statusEl.className = 'auth-status error'
    }
  })
}

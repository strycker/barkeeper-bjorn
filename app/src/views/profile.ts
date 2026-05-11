import { appState, loadSettings } from '../state'
import { getFile } from '../github-api'
import type { ProfileData } from '../types'
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

const FILE_PATH = 'data/bar-owner-profile.json'

const AXIS_LABELS = ['Sweetness', 'Acid', 'Strength', 'Complexity', 'Season', 'Risk']
const AXIS_KEYS = ['sweetness', 'acid', 'strength', 'complexity', 'season', 'risk'] as const

// Map text position → numeric value for radar chart
function positionToValue(pos: string | null): number {
  if (!pos) return 0
  const p = pos.toLowerCase()
  if (p.includes('strong a') || p === 'strong a') return 1
  if (p.includes('lean a') || p === 'lean a') return 2
  if (p.includes('middle') || p === 'middle') return 3
  if (p.includes('lean b') || p === 'lean b') return 4
  if (p.includes('strong b') || p === 'strong b') return 5
  // Fallback: if set but unrecognized, show as middle
  return 3
}

function confidenceDot(c: string): string {
  const cls = c === 'High' ? 'conf-high' : c === 'Medium' ? 'conf-med' : c === 'Tentative' ? 'conf-tent' : 'conf-none'
  return `<span class="conf-dot ${cls}" title="Confidence: ${c}"></span>`
}

let chartInstance: Chart | null = null

export async function renderProfile(container: HTMLElement): Promise<void> {
  container.innerHTML = `<div class="loading">Loading profile…</div>`
  const settings = loadSettings()
  try {
    const fs = await getFile<ProfileData>(settings, FILE_PATH)
    appState.profile = fs
    renderProfileData(container, fs.data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    container.innerHTML = `<div class="error-state">Failed to load profile: ${msg}</div>`
  }
}

function renderProfileData(container: HTMLElement, data: ProfileData): void {
  const name = data.identity.preferred_name || data.identity.full_name || 'Unknown'
  const axes = data.flavor_profile.axes
  const supp = data.flavor_profile.supplemental
  const archetypes = data.archetypes ?? []

  container.innerHTML = `
    <div class="view-header">
      <h1>Flavor Profile</h1>
      ${name !== 'Unknown' ? `<p class="subtitle">${name}</p>` : ''}
    </div>

    ${archetypes.length ? `
    <div class="archetype-row">
      ${archetypes.map(a => `<span class="chip chip-archetype">${a}</span>`).join('')}
    </div>` : ''}

    <div class="profile-layout">
      <div class="radar-wrap">
        <canvas id="flavor-radar" width="340" height="340"></canvas>
      </div>

      <div class="axes-table-wrap">
        <table class="axes-table">
          <thead><tr><th>Axis</th><th>Position</th><th>Conf.</th></tr></thead>
          <tbody>
            ${AXIS_KEYS.map((k, i) => {
              const ax = axes[k]
              return `<tr>
                <td>${AXIS_LABELS[i]}</td>
                <td>${ax.position ?? '<em class="unset">unset</em>'}</td>
                <td>${confidenceDot(ax.confidence)} ${ax.confidence}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="supplemental-section">
      <h2>Supplemental Calibration</h2>
      <table class="supp-table">
        <thead><tr><th>Dimension</th><th>Position</th><th>Notes</th></tr></thead>
        <tbody>
          <tr>
            <td>Smoke (mezcal, peated Scotch)</td>
            <td>${supp.smoke.position ?? '<em class="unset">unset</em>'}</td>
            <td>${supp.smoke.notes ?? '—'}</td>
          </tr>
          <tr>
            <td>Funk (high-ester rum, fermented notes)</td>
            <td>${supp.funk.position ?? '<em class="unset">unset</em>'}</td>
            <td>${supp.funk.notes ?? '—'}</td>
          </tr>
          <tr>
            <td>Savory / Saline (olive brine, miso, sea salt)</td>
            <td>${supp.savory_saline.position ?? '<em class="unset">unset</em>'}</td>
            <td>${supp.savory_saline.notes ?? '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${data.background ? `
    <div class="profile-meta-section">
      <h2>Background</h2>
      <dl class="meta-dl">
        ${data.background.profession ? `<dt>Profession</dt><dd>${data.background.profession}</dd>` : ''}
        ${data.background.drinking_frequency ? `<dt>Frequency</dt><dd>${data.background.drinking_frequency}</dd>` : ''}
        ${data.background.typical_context ? `<dt>Context</dt><dd>${data.background.typical_context}</dd>` : ''}
        ${data.constraints?.bar_budget ? `<dt>Bar budget</dt><dd>${data.constraints.bar_budget}</dd>` : ''}
        ${data.constraints?.space ? `<dt>Space</dt><dd>${data.constraints.space}</dd>` : ''}
      </dl>
    </div>` : ''}

    ${data.evolution_log?.length ? `
    <div class="profile-meta-section">
      <h2>Evolution Log</h2>
      <table class="evo-table">
        <thead><tr><th>Date</th><th>Change</th><th>Reason</th></tr></thead>
        <tbody>
          ${data.evolution_log.map(e => `<tr>
            <td>${e.date}</td><td>${e.change}</td><td>${e.reason ?? '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
  `

  // Destroy existing chart instance if re-rendering
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }

  const canvas = container.querySelector('#flavor-radar') as HTMLCanvasElement | null
  if (!canvas) return

  const values = AXIS_KEYS.map(k => positionToValue(axes[k].position))
  const allUnset = values.every(v => v === 0)

  chartInstance = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: AXIS_LABELS,
      datasets: [{
        label: 'Flavor Profile',
        data: allUnset ? [0, 0, 0, 0, 0, 0] : values,
        backgroundColor: 'rgba(194, 154, 83, 0.15)',
        borderColor: 'rgba(194, 154, 83, 0.85)',
        pointBackgroundColor: 'rgba(194, 154, 83, 1)',
        pointRadius: 4,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: false,
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: { stepSize: 1, display: false },
          grid: { color: 'rgba(255,255,255,0.08)' },
          angleLines: { color: 'rgba(255,255,255,0.12)' },
          pointLabels: {
            color: '#c2c2c2',
            font: { size: 12, family: "'Inter', sans-serif" },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const key = AXIS_KEYS[ctx.dataIndex]
              return axes[key].position ?? 'unset'
            },
          },
        },
      },
    },
  })
}

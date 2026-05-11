import { appState, loadSettings } from '../state'
import { getFile, putFile } from '../github-api'
import type { BottleEntry, InventoryData } from '../types'

const FILE_PATH = 'data/inventory.json'

interface PendingChange {
  type: 'add' | 'remove';
  description: string;
}

const pendingChanges: PendingChange[] = []

function tierBadge(tier?: string): string {
  if (!tier) return ''
  const cls = tier.replace('/', '-').replace(' ', '-')
  return `<span class="tier-badge tier-${cls}">${tier}</span>`
}

function bestForBadge(bf?: string): string {
  if (!bf) return ''
  return `<span class="bestfor-badge">${bf}</span>`
}

function renderBottleList(bottles: BottleEntry[], categoryKey: string): string {
  if (!bottles.length) return '<p class="empty-category">None stocked.</p>'
  return `<div class="bottle-grid">${bottles.map((b, i) => `
    <div class="bottle-card" data-category="${categoryKey}" data-index="${i}">
      <div class="bottle-name">${b.name}</div>
      <div class="bottle-meta">
        ${tierBadge(b.tier)}
        ${bestForBadge(b.best_for)}
      </div>
      ${b.notes ? `<div class="bottle-notes">${b.notes}</div>` : ''}
      <button class="btn-remove" data-category="${categoryKey}" data-index="${i}" title="Move to past inventory">✕</button>
    </div>
  `).join('')}</div>`
}

type FlatCategory = {
  key: string;
  label: string;
  getItems: (d: InventoryData) => BottleEntry[];
  setItems: (d: InventoryData, items: BottleEntry[]) => void;
};

const BOTTLE_CATEGORIES: FlatCategory[] = [
  { key: 'whiskey', label: 'Whisk(e)y', getItems: d => d.base_spirits.whiskey, setItems: (d, v) => { d.base_spirits.whiskey = v } },
  { key: 'brandy', label: 'Brandy / Aged Grape', getItems: d => d.base_spirits.brandy, setItems: (d, v) => { d.base_spirits.brandy = v } },
  { key: 'rum', label: 'Rum / Cane', getItems: d => d.base_spirits.rum, setItems: (d, v) => { d.base_spirits.rum = v } },
  { key: 'agave', label: 'Agave (Tequila / Mezcal)', getItems: d => d.base_spirits.agave, setItems: (d, v) => { d.base_spirits.agave = v } },
  { key: 'white_spirits', label: 'White Spirits (Gin / Vodka)', getItems: d => d.base_spirits.white_spirits, setItems: (d, v) => { d.base_spirits.white_spirits = v } },
  { key: 'base_other', label: 'Other Base Spirits', getItems: d => d.base_spirits.other, setItems: (d, v) => { d.base_spirits.other = v } },
  { key: 'fortified', label: 'Fortified & Aperitif Wines', getItems: d => d.fortified_wines_and_aperitif_wines, setItems: (d, v) => { d.fortified_wines_and_aperitif_wines = v } },
  { key: 'fruit_forward', label: 'Liqueurs — Fruit', getItems: d => d.liqueurs_and_cordials.fruit_forward, setItems: (d, v) => { d.liqueurs_and_cordials.fruit_forward = v } },
  { key: 'nut_coffee', label: 'Liqueurs — Nut / Coffee', getItems: d => d.liqueurs_and_cordials.nut_coffee, setItems: (d, v) => { d.liqueurs_and_cordials.nut_coffee = v } },
  { key: 'herbal', label: 'Liqueurs — Herbal', getItems: d => d.liqueurs_and_cordials.herbal, setItems: (d, v) => { d.liqueurs_and_cordials.herbal = v } },
  { key: 'specialty', label: 'Liqueurs — Specialty / Regional', getItems: d => d.liqueurs_and_cordials.specialty_regional, setItems: (d, v) => { d.liqueurs_and_cordials.specialty_regional = v } },
  { key: 'bitters_anchors', label: 'Bitters — Anchors', getItems: d => d.bitters.anchors, setItems: (d, v) => { d.bitters.anchors = v } },
  { key: 'bitters_other', label: 'Bitters — Specialty', getItems: d => [...d.bitters.aromatic_smoke, ...d.bitters.nut_earth, ...d.bitters.fruit_botanical, ...d.bitters.other], setItems: (d, v) => { d.bitters.other = v } },
  { key: 'syrups', label: 'Syrups', getItems: d => d.syrups, setItems: (d, v) => { d.syrups = v } },
]

export async function renderInventory(container: HTMLElement): Promise<void> {
  container.innerHTML = `<div class="loading">Loading inventory…</div>`
  const settings = loadSettings()
  try {
    const fs = await getFile<InventoryData>(settings, FILE_PATH)
    appState.inventory = fs
    renderInventoryData(container, fs.data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    container.innerHTML = `<div class="error-state">Failed to load inventory: ${msg}<br><br>Check your settings and try again.</div>`
  }
}

function renderInventoryData(container: HTMLElement, data: InventoryData): void {
  const totalBottles = BOTTLE_CATEGORIES.reduce((n, c) => n + c.getItems(data).length, 0)

  container.innerHTML = `
    <div class="view-header">
      <h1>Inventory</h1>
      <div class="view-header-actions">
        <span class="stat-badge">${totalBottles} bottle${totalBottles !== 1 ? 's' : ''}</span>
        <button id="save-inventory" class="btn-primary" disabled>Save Changes</button>
      </div>
    </div>

    <div id="pending-banner" class="pending-banner hidden"></div>

    <div class="inventory-sections">
      <section class="inv-section">
        <h2>Spirits &amp; Bottles</h2>
        <div class="accordion" id="bottle-accordion">
          ${BOTTLE_CATEGORIES.map(cat => {
            const items = cat.getItems(data)
            return `
            <div class="accordion-item ${items.length === 0 ? 'empty' : ''}">
              <button class="accordion-header" data-cat="${cat.key}">
                <span class="acc-label">${cat.label}</span>
                <span class="acc-count">${items.length}</span>
                <span class="acc-arrow">▶</span>
              </button>
              <div class="accordion-body" id="acc-body-${cat.key}">
                ${renderBottleList(items, cat.key)}
                <div class="add-bottle-form" id="add-form-${cat.key}">
                  <input type="text" class="add-name" placeholder="Bottle name (brand + expression)" />
                  <select class="add-tier">
                    <option value="">— tier —</option>
                    <option value="industrial">Industrial</option>
                    <option value="premium-accessible">Premium-accessible</option>
                    <option value="boutique">Boutique</option>
                    <option value="rare/exceptional">Rare / Exceptional</option>
                  </select>
                  <select class="add-bestfor">
                    <option value="">— best for —</option>
                    <option value="sipping">Sipping</option>
                    <option value="mixing">Mixing</option>
                    <option value="both">Both</option>
                  </select>
                  <button class="btn-add" data-category="${cat.key}">Add</button>
                </div>
              </div>
            </div>`
          }).join('')}
        </div>
      </section>

      <section class="inv-section">
        <h2>Veto Lists</h2>
        <div class="veto-block">
          <h3>Permanently Disliked (Never Suggest)</h3>
          <div class="chip-list">
            ${data.vetoes.disliked_ingredients.length
              ? data.vetoes.disliked_ingredients.map(v => `<span class="chip chip-veto">${v}</span>`).join('')
              : '<span class="empty-inline">None set.</span>'}
          </div>
          <h3 style="margin-top:1rem">Substitute For Now</h3>
          <div class="sub-list">
            ${data.vetoes.substitute_for_now.length
              ? data.vetoes.substitute_for_now.map(s => `
                <div class="sub-item">
                  <span class="sub-missing">${s.missing}</span>
                  <span class="sub-arrow">→</span>
                  <span class="sub-sub">${s.substitute}${s.ratio ? ` (${s.ratio})` : ''}</span>
                </div>`).join('')
              : '<span class="empty-inline">None set.</span>'}
          </div>
        </div>
      </section>
    </div>
  `

  wireInventoryEvents(container, data)
}

function wireInventoryEvents(container: HTMLElement, data: InventoryData): void {
  // Accordion toggle
  container.querySelectorAll('.accordion-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = (btn as HTMLElement).dataset.cat!
      const body = container.querySelector(`#acc-body-${cat}`)!
      const arrow = btn.querySelector('.acc-arrow')!
      const isOpen = body.classList.contains('open')
      body.classList.toggle('open', !isOpen)
      arrow.textContent = isOpen ? '▶' : '▼'
    })
  })

  // Add bottle
  container.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = (btn as HTMLElement).dataset.category!
      const form = container.querySelector(`#add-form-${cat}`) as HTMLElement
      const nameInput = form.querySelector('.add-name') as HTMLInputElement
      const tierSel = form.querySelector('.add-tier') as HTMLSelectElement
      const bfSel = form.querySelector('.add-bestfor') as HTMLSelectElement
      const name = nameInput.value.trim()
      if (!name) { nameInput.focus(); return }
      const category = BOTTLE_CATEGORIES.find(c => c.key === cat)!
      const entry: BottleEntry = { name, tier: tierSel.value as BottleEntry['tier'] || undefined, best_for: bfSel.value as BottleEntry['best_for'] || undefined }
      category.getItems(data).push(entry)
      nameInput.value = ''
      tierSel.value = ''
      bfSel.value = ''
      pendingChanges.push({ type: 'add', description: `Added ${name}` })
      markDirty(container)
      renderInventoryData(container, data)
    })
  })

  // Remove bottle
  container.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = (btn as HTMLElement).dataset.category!
      const idx = parseInt((btn as HTMLElement).dataset.index!, 10)
      const category = BOTTLE_CATEGORIES.find(c => c.key === cat)!
      const items = category.getItems(data)
      const [removed] = items.splice(idx, 1)
      data.past_inventory.push({ item: removed.name, notes: `Removed ${new Date().toLocaleDateString()}` })
      pendingChanges.push({ type: 'remove', description: `Removed ${removed.name} → past inventory` })
      markDirty(container)
      renderInventoryData(container, data)
    })
  })

  // Save
  const saveBtn = container.querySelector('#save-inventory') as HTMLButtonElement
  saveBtn?.addEventListener('click', async () => {
    if (!appState.inventory) return
    saveBtn.textContent = 'Saving…'
    saveBtn.disabled = true
    try {
      const settings = loadSettings()
      const result = await putFile(settings, FILE_PATH, data, appState.inventory.sha, `app: update inventory (${pendingChanges.length} change${pendingChanges.length !== 1 ? 's' : ''})`)
      appState.inventory = { data, sha: result.sha, fetchedAt: Date.now() }
      pendingChanges.length = 0
      showBanner(container, '✓ Saved to GitHub', 'success')
      saveBtn.textContent = 'Save Changes'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showBanner(container, `✗ Save failed: ${msg}`, 'error')
      saveBtn.textContent = 'Save Changes'
      saveBtn.disabled = false
    }
  })
}

function markDirty(container: HTMLElement): void {
  const saveBtn = container.querySelector('#save-inventory') as HTMLButtonElement | null
  if (saveBtn) {
    saveBtn.disabled = false
    saveBtn.textContent = `Save Changes (${pendingChanges.length})`
  }
}

function showBanner(container: HTMLElement, msg: string, type: 'success' | 'error'): void {
  const banner = container.querySelector('#pending-banner') as HTMLElement | null
  if (!banner) return
  banner.textContent = msg
  banner.className = `pending-banner ${type}`
  setTimeout(() => banner.classList.add('hidden'), 4000)
}

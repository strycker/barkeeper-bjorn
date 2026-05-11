import { appState, loadSettings } from '../state'
import { getFile, putFile } from '../github-api'
import type { InventoryData, ShoppingItem } from '../types'

const FILE_PATH = 'data/inventory.json'

export async function renderShopping(container: HTMLElement): Promise<void> {
  container.innerHTML = `<div class="loading">Loading shopping list…</div>`
  const settings = loadSettings()
  try {
    // Reuse cached inventory if already loaded
    if (!appState.inventory) {
      appState.inventory = await getFile<InventoryData>(settings, FILE_PATH)
    }
    renderShoppingData(container, appState.inventory.data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    container.innerHTML = `<div class="error-state">Failed to load shopping list: ${msg}</div>`
  }
}

function renderShoppingData(container: HTMLElement, data: InventoryData): void {
  const list = [...(data.shopping_list ?? [])].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))

  container.innerHTML = `
    <div class="view-header">
      <h1>Shopping List</h1>
      <div class="view-header-actions">
        <span class="stat-badge">${list.length} item${list.length !== 1 ? 's' : ''}</span>
        <button id="save-shopping" class="btn-primary" disabled>Save Changes</button>
      </div>
    </div>

    <div id="shop-banner" class="pending-banner hidden"></div>

    ${list.length === 0 ? `
      <div class="empty-state-block">
        <p>Your shopping list is empty.</p>
        <p class="hint">Ask the agent to run a gap analysis — it will populate this list with the highest-impact next purchases based on your inventory and flavor profile.</p>
      </div>` : `
      <ul class="shopping-list" id="shopping-list">
        ${list.map((item, i) => renderShoppingItem(item, i)).join('')}
      </ul>
    `}

    <div class="add-shopping-form">
      <h2>Add Item</h2>
      <div class="add-shopping-row">
        <input type="text" id="shop-name" placeholder="Bottle name" />
        <input type="number" id="shop-priority" placeholder="Priority (1 = top)" min="1" style="width:120px" />
        <input type="number" id="shop-price" placeholder="Est. price (USD)" min="0" step="0.01" style="width:140px" />
        <button id="btn-add-shopping" class="btn-primary">Add</button>
      </div>
      <div class="add-shopping-row" style="margin-top:0.5rem">
        <input type="text" id="shop-rationale" placeholder="Rationale / what it unlocks (optional)" style="flex:1" />
      </div>
    </div>
  `

  wireShoppingEvents(container, data, list)
}

function renderShoppingItem(item: ShoppingItem, i: number): string {
  return `
    <li class="shopping-item" data-index="${i}">
      <label class="shop-check-label">
        <input type="checkbox" class="shop-check" data-index="${i}" />
        <span class="shop-priority">#${item.priority ?? i + 1}</span>
        <span class="shop-name">${item.item}</span>
      </label>
      <div class="shop-meta">
        ${item.estimated_price_usd != null ? `<span class="shop-price">~$${item.estimated_price_usd}</span>` : ''}
        ${item.unlocks?.length ? `<span class="shop-unlocks">Unlocks: ${item.unlocks.join(', ')}</span>` : ''}
        ${item.rationale ? `<span class="shop-rationale">${item.rationale}</span>` : ''}
      </div>
    </li>`
}

function wireShoppingEvents(container: HTMLElement, data: InventoryData, _sorted: ShoppingItem[]): void {
  let dirty = false

  function markDirty() {
    dirty = true
    const btn = container.querySelector('#save-shopping') as HTMLButtonElement | null
    if (btn) btn.disabled = false
  }

  // Check off → remove from list, prompt to add to inventory
  container.querySelectorAll('.shop-check').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const cb = e.target as HTMLInputElement
      const idx = parseInt(cb.dataset.index!, 10)
      const sorted = [...(data.shopping_list ?? [])].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
      const item = sorted[idx]
      if (!item) return
      // Remove from shopping list
      const realIdx = data.shopping_list.findIndex(s => s.item === item.item)
      if (realIdx !== -1) data.shopping_list.splice(realIdx, 1)
      markDirty()
      showBanner(container, `✓ "${item.item}" marked as purchased — removed from list.`, 'success')
      setTimeout(() => renderShoppingData(container, data), 1500)
    })
  })

  // Add item
  container.querySelector('#btn-add-shopping')?.addEventListener('click', () => {
    const name = (container.querySelector('#shop-name') as HTMLInputElement).value.trim()
    if (!name) { (container.querySelector('#shop-name') as HTMLInputElement).focus(); return }
    const priority = parseInt((container.querySelector('#shop-priority') as HTMLInputElement).value, 10) || undefined
    const price = parseFloat((container.querySelector('#shop-price') as HTMLInputElement).value) || undefined
    const rationale = (container.querySelector('#shop-rationale') as HTMLInputElement).value.trim() || undefined
    data.shopping_list.push({ item: name, priority, estimated_price_usd: price, rationale })
    markDirty()
    renderShoppingData(container, data)
  })

  // Save
  container.querySelector('#save-shopping')?.addEventListener('click', async () => {
    if (!dirty || !appState.inventory) return
    const saveBtn = container.querySelector('#save-shopping') as HTMLButtonElement
    saveBtn.textContent = 'Saving…'
    saveBtn.disabled = true
    try {
      const settings = loadSettings()
      const result = await putFile(settings, FILE_PATH, data, appState.inventory.sha, 'app: update shopping list')
      appState.inventory = { data, sha: result.sha, fetchedAt: Date.now() }
      dirty = false
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

function showBanner(container: HTMLElement, msg: string, type: 'success' | 'error'): void {
  const banner = container.querySelector('#shop-banner') as HTMLElement | null
  if (!banner) return
  banner.textContent = msg
  banner.className = `pending-banner ${type}`
  setTimeout(() => banner.classList.add('hidden'), 4000)
}

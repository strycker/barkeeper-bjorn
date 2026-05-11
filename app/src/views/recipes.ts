import { appState, loadSettings } from '../state'
import { getFile, rawImageUrl } from '../github-api'
import type { RecipesData, RecipeOriginal, ConfirmedFavorite } from '../types'

const FILE_PATH = 'data/recipes.json'

export async function renderRecipes(container: HTMLElement): Promise<void> {
  container.innerHTML = `<div class="loading">Loading recipes…</div>`
  const settings = loadSettings()
  try {
    const fs = await getFile<RecipesData>(settings, FILE_PATH)
    appState.recipes = fs
    renderRecipesData(container, fs.data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    container.innerHTML = `<div class="error-state">Failed to load recipes: ${msg}</div>`
  }
}

function methodBadge(method?: string): string {
  if (!method) return ''
  return `<span class="method-badge method-${method.toLowerCase()}">${method}</span>`
}

function renderOriginalCard(r: RecipeOriginal, settings: ReturnType<typeof loadSettings>): string {
  const thumb = r.images?.[0]
    ? `<img class="recipe-thumb" src="${rawImageUrl(settings, r.images[0].filename)}" alt="${r.name}" loading="lazy" />`
    : `<div class="recipe-thumb-placeholder">${r.id}</div>`
  return `
    <div class="recipe-card" data-id="${r.id}">
      ${thumb}
      <div class="recipe-card-body">
        <div class="recipe-card-header">
          <span class="recipe-id">${r.id}</span>
          ${methodBadge(r.method_type)}
        </div>
        <h3 class="recipe-name">${r.name}</h3>
        ${r.tagline ? `<p class="recipe-tagline">${r.tagline}</p>` : ''}
        <p class="recipe-creator">${r.creator}</p>
        ${r.profile ? `<p class="recipe-profile">${r.profile}</p>` : ''}
      </div>
    </div>`
}

function renderFavoriteCard(f: ConfirmedFavorite): string {
  return `
    <div class="recipe-card fav-card" data-fav="${encodeURIComponent(f.name)}">
      <div class="recipe-thumb-placeholder fav-thumb">★</div>
      <div class="recipe-card-body">
        <h3 class="recipe-name">${f.name}</h3>
        ${f.creator ? `<p class="recipe-creator">${f.creator}</p>` : ''}
        ${f.notes ? `<p class="recipe-profile">${f.notes}</p>` : ''}
        ${f.adaptation ? `<p class="recipe-adapt"><em>Adaptation:</em> ${f.adaptation}</p>` : ''}
      </div>
    </div>`
}

function renderRecipesData(container: HTMLElement, data: RecipesData): void {
  const settings = loadSettings()
  const originals = data.originals ?? []
  const favorites = data.confirmed_favorites ?? []
  const wishlist = data.wishlist ?? []

  container.innerHTML = `
    <div class="view-header">
      <h1>Recipes</h1>
      <div class="view-header-actions">
        <span class="stat-badge">${originals.length} original${originals.length !== 1 ? 's' : ''}</span>
        <span class="stat-badge">${favorites.length} favorite${favorites.length !== 1 ? 's' : ''}</span>
      </div>
    </div>

    <section class="recipe-section">
      <h2>Originals</h2>
      ${originals.length
        ? `<div class="recipe-grid" id="originals-grid">
            ${originals.map(r => renderOriginalCard(r, settings)).join('')}
           </div>`
        : `<p class="empty-state">No originals yet — ask the agent to design one.</p>`}
    </section>

    <section class="recipe-section">
      <h2>Confirmed Favorites</h2>
      ${favorites.length
        ? `<div class="recipe-grid">${favorites.map(f => renderFavoriteCard(f)).join('')}</div>`
        : `<p class="empty-state">None confirmed yet.</p>`}
    </section>

    ${wishlist.length ? `
    <section class="recipe-section">
      <h2>Wishlist</h2>
      <ul class="wishlist">
        ${wishlist.map(w => `<li><strong>${w.name}</strong>${w.ingredients_summary ? ` — ${w.ingredients_summary}` : ''}${w.pending ? ` <span class="pending-tag">pending: ${w.pending}</span>` : ''}</li>`).join('')}
      </ul>
    </section>` : ''}

    <div id="recipe-modal" class="modal hidden"></div>
  `

  // Wire card clicks for originals
  container.querySelectorAll('.recipe-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id!
      const recipe = originals.find(r => r.id === id)
      if (recipe) openModal(container, recipe, settings)
    })
  })

  // Wire card clicks for favorites
  container.querySelectorAll('.recipe-card[data-fav]').forEach(card => {
    card.addEventListener('click', () => {
      const name = decodeURIComponent((card as HTMLElement).dataset.fav!)
      const fav = favorites.find(f => f.name === name)
      if (fav) openFavModal(container, fav)
    })
  })
}

function openModal(container: HTMLElement, r: RecipeOriginal, settings: ReturnType<typeof loadSettings>): void {
  const modal = container.querySelector('#recipe-modal') as HTMLElement
  const images = r.images?.map(img =>
    `<img src="${rawImageUrl(settings, img.filename)}" alt="${img.alt_text ?? r.name}" width="200" loading="lazy" />`
  ).join(' ') ?? ''

  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <button class="modal-close">✕</button>
      <div class="modal-header">
        <span class="recipe-id">${r.id}</span>
        ${methodBadge(r.method_type)}
        <h2>${r.name}</h2>
        ${r.tagline ? `<p class="recipe-tagline">${r.tagline}</p>` : ''}
        <p class="recipe-creator">${r.creator}</p>
      </div>
      ${images ? `<div class="modal-images">${images}</div>` : ''}
      <table class="ingredient-table">
        <thead><tr><th>Ingredient</th><th>Amount</th></tr></thead>
        <tbody>
          ${r.ingredients.map(ing => `<tr>
            <td>${ing.name}${ing.notes ? ` <em>(${ing.notes})</em>` : ''}</td>
            <td>${ing.amount}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${r.method ? `<p><strong>Method:</strong> ${r.method}</p>` : ''}
      ${r.garnish ? `<p><strong>Garnish:</strong> ${r.garnish}</p>` : ''}
      ${r.glassware ? `<p><strong>Glass:</strong> ${r.glassware}</p>` : ''}
      ${r.profile ? `<p><strong>Profile:</strong> ${r.profile}</p>` : ''}
      ${r.why_it_works ? `<div class="why-section"><strong>Why it works</strong><p>${r.why_it_works}</p></div>` : ''}
      ${r.variations?.length ? `
        <div class="variation-section">
          <strong>Variations</strong>
          ${r.variations.map(v => `<p><em>${v.name}:</em> ${v.description}</p>`).join('')}
        </div>` : ''}
    </div>
  `

  modal.classList.remove('hidden')
  modal.querySelector('.modal-overlay')!.addEventListener('click', () => modal.classList.add('hidden'))
  modal.querySelector('.modal-close')!.addEventListener('click', () => modal.classList.add('hidden'))
}

function openFavModal(container: HTMLElement, f: ConfirmedFavorite): void {
  const modal = container.querySelector('#recipe-modal') as HTMLElement
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <button class="modal-close">✕</button>
      <div class="modal-header">
        <span class="recipe-id">★</span>
        <h2>${f.name}</h2>
        ${f.creator ? `<p class="recipe-creator">${f.creator}</p>` : ''}
      </div>
      ${f.ingredients?.length ? `
        <table class="ingredient-table">
          <thead><tr><th>Ingredient</th><th>Amount</th></tr></thead>
          <tbody>
            ${f.ingredients.map(ing => `<tr><td>${ing.name}</td><td>${ing.amount}</td></tr>`).join('')}
          </tbody>
        </table>` : ''}
      ${f.method ? `<p><strong>Method:</strong> ${f.method}</p>` : ''}
      ${f.garnish ? `<p><strong>Garnish:</strong> ${f.garnish}</p>` : ''}
      ${f.adaptation ? `<div class="why-section"><strong>Adaptation</strong><p>${f.adaptation}</p></div>` : ''}
      ${f.notes ? `<p>${f.notes}</p>` : ''}
    </div>
  `
  modal.classList.remove('hidden')
  modal.querySelector('.modal-overlay')!.addEventListener('click', () => modal.classList.add('hidden'))
  modal.querySelector('.modal-close')!.addEventListener('click', () => modal.classList.add('hidden'))
}

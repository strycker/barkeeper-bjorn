import './styles/main.css'
import { hasSettings } from './state'
import { renderSettings } from './views/settings'
import { renderInventory } from './views/inventory'
import { renderProfile } from './views/profile'
import { renderRecipes } from './views/recipes'
import { renderShopping } from './views/shopping'

type Route = 'inventory' | 'recipes' | 'profile' | 'shopping' | 'settings'

const NAV_ITEMS: { route: Route; label: string }[] = [
  { route: 'inventory', label: 'Inventory' },
  { route: 'recipes', label: 'Recipes' },
  { route: 'profile', label: 'Profile' },
  { route: 'shopping', label: 'Shopping' },
  { route: 'settings', label: 'Settings' },
]

function getRoute(): Route {
  const hash = location.hash.replace('#', '') as Route
  const valid: Route[] = ['inventory', 'recipes', 'profile', 'shopping', 'settings']
  return valid.includes(hash) ? hash : 'inventory'
}

function setRoute(route: Route): void {
  location.hash = route
}

function renderNav(activeRoute: Route): void {
  const nav = document.getElementById('main-nav')!
  nav.innerHTML = NAV_ITEMS.map(({ route, label }) => `
    <a href="#${route}" class="nav-link ${route === activeRoute ? 'active' : ''}" data-route="${route}">${label}</a>
  `).join('')
}

async function renderView(route: Route): Promise<void> {
  const container = document.getElementById('view-container')!
  renderNav(route)

  if (!hasSettings() && route !== 'settings') {
    renderSettings(container, () => setRoute('inventory'))
    return
  }

  switch (route) {
    case 'inventory': await renderInventory(container); break
    case 'recipes':   await renderRecipes(container); break
    case 'profile':   await renderProfile(container); break
    case 'shopping':  await renderShopping(container); break
    case 'settings':  renderSettings(container, () => setRoute('inventory')); break
  }
}

// Initial render
renderView(hasSettings() ? getRoute() : 'settings')

// Hash-based routing
window.addEventListener('hashchange', () => renderView(getRoute()))

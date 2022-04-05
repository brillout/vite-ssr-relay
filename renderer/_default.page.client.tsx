import ReactDOMClient from 'react-dom/client'
import type { Environment } from 'react-relay'
import type { PageContextBuiltInClient } from 'vite-plugin-ssr/client'
import type { PageContext } from '../types'
import preloadQuery from './preloadQuery'
import { PageShell } from './PageShell'
import { RouteManager } from './routeManager'

let containerRoot: ReactDOMClient.Root | null = null
let relayEnvironment: Environment | null = null
let routeManager: RouteManager | null = null

export const clientRouting = true

// `render()` is called on every navigation.
export async function render(
  pageContext: PageContextBuiltInClient & PageContext
) {
  const {
    Page,
    relayInitialData,
    exports: { initRelayEnvironment, head },
  } = pageContext

  if (!relayEnvironment)
    relayEnvironment = initRelayEnvironment(false, relayInitialData)

  // Load the query needed for the page.
  // Preloading through links is not supported yet, see https://github.com/brillout/vite-plugin-ssr/issues/246 for details.
  const relayQueryRef = preloadQuery(pageContext, relayEnvironment)

  // Create a new route manager if haven't.
  routeManager ??= new RouteManager()
  // Update the route manager with the new route.
  routeManager.setPage(Page, relayQueryRef)

  if (head) {
    const headTags: string[] = []
    for (const [tag, value] of Object.entries(head)) {
      if (tag === 'meta') {
        for (const [name, content] of Object.entries(value)) {
          headTags.push(`<meta name="${name}" content="${content}">`)
        }
      } else {
        headTags.push(`<${tag}>${value}</${tag}>`)
      }
    }

    document.head.innerHTML = document.head.innerHTML.replace(
      /<!--\s?vite-ssr-relay-head-start\s?-->([\S\s]+)<!--\s?vite-ssr-relay-head-end\s?-->/,
      `<!-- vite-ssr-relay-head-start -->${headTags}<!-- vite-ssr-relay-head-end -->`
    )
  }

  if (!containerRoot) {
    const page = (
      <PageShell
        pageContext={pageContext}
        relayEnvironment={relayEnvironment}
        routeManager={routeManager}
      />
    )

    // Hydrate the page.
    const container = document.getElementById('page-view')
    if (!container)
      throw new Error(
        'Element with id "page-view" not found, which was expected to be a container root.'
      )

    if (pageContext.isHydration) {
      containerRoot = ReactDOMClient.hydrateRoot(container, page)
    } else {
      containerRoot = ReactDOMClient.createRoot(container)
      containerRoot.render(page)
    }
  }
}

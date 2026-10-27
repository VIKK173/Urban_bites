'use client'

import { useCallback, useEffect, useState } from 'react'

export interface RouteInfo {
  /** e.g. ["product", "classic-smash-burger"] for #/product/classic-smash-burger */
  segments: string[]
  query: URLSearchParams
  raw: string
  /** false during SSR and the hydrating render; the real hash is applied right after mount */
  ready: boolean
}

function parseHash(hash: string): RouteInfo {
  let h = hash.replace(/^#/, '')
  if (!h.startsWith('/')) h = '/' + h
  const [pathPart, queryPart] = h.split('?')
  const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent)
  return { segments, query: new URLSearchParams(queryPart || ''), raw: h, ready: true }
}

/** SSR and the client's hydrating render must produce identical output, so both start
 * from this default and switch to the URL hash only after mount. */
const SSR_ROUTE: RouteInfo = { segments: [], query: new URLSearchParams(), raw: '/', ready: false }

// Next.js <Link> updates the hash through history.pushState, which fires no
// 'hashchange' event — patch both methods once so every navigation path
// (Link clicks, navigate(), browser back/forward) reaches the router.
  if (typeof window !== 'undefined') {
    const patched = history as History & { __ubHashPatch?: boolean }
    if (!patched.__ubHashPatch) {
      patched.__ubHashPatch = true
      for (const method of ['pushState', 'replaceState'] as const) {
        const orig = history[method].bind(history) as (...args: unknown[]) => void
        history[method] = ((...args: unknown[]) => {
          const prevHash = window.location.hash
          orig(...args)
          const nextHash = window.location.hash
          if (prevHash !== nextHash) {
            // Defer dispatch to a macrotask so event handlers calling setState
            // never run synchronously inside React's useInsertionEffect or render phases.
            setTimeout(() => {
              window.dispatchEvent(new Event('hashchange'))
            }, 0)
          }
        }) as typeof history[typeof method]
      }
    }
  }

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const target = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`
  // Both paths end in a 'hashchange' event: location.hash fires it natively,
  // history.replaceState through the patch above.
  if (opts.replace) window.history.replaceState(null, '', target)
  else window.location.hash = target.slice(1)
}

export function useHashRoute(): RouteInfo {
  const [route, setRoute] = useState<RouteInfo>(SSR_ROUTE)

  useEffect(() => {
    let prevPath = window.location.hash.replace(/^#/, '').split('?')[0]
    const onChange = () => {
      setRoute(parseHash(window.location.hash))
      const nextPath = window.location.hash.replace(/^#/, '').split('?')[0]
      if (prevPath !== nextPath) {
        prevPath = nextPath
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      }
    }
    onChange()
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export function useNavigate() {
  return useCallback((to: string, opts?: { replace?: boolean }) => navigate(to, opts), [])
}

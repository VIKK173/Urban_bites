'use client'

import { useCallback, useEffect, useState } from 'react'

export interface RouteInfo {
  /** e.g. ["product", "classic-smash-burger"] for #/product/classic-smash-burger */
  segments: string[]
  query: URLSearchParams
  raw: string
}

function parseHash(hash: string): RouteInfo {
  let h = hash.replace(/^#/, '')
  if (!h.startsWith('/')) h = '/' + h
  const [pathPart, queryPart] = h.split('?')
  const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent)
  return { segments, query: new URLSearchParams(queryPart || ''), raw: h }
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const target = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`
  if (opts.replace) {
    window.history.replaceState(null, '', target)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = target.slice(1)
  }
}

export function useHashRoute(): RouteInfo {
  const [route, setRoute] = useState<RouteInfo>(() =>
    typeof window === 'undefined' ? { segments: [], query: new URLSearchParams(), raw: '/' } : parseHash(window.location.hash),
  )

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export function useNavigate() {
  return useCallback((to: string, opts?: { replace?: boolean }) => navigate(to, opts), [])
}

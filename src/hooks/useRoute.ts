import { useEffect, useState } from 'react'

export type Route = 'hoy' | 'shadowing' | 'conversar' | 'frases'

const ROUTES: Route[] = ['hoy', 'shadowing', 'conversar', 'frases']

function readHash(): Route {
  const hash = window.location.hash.replace('#', '').split('?')[0]
  return (ROUTES as string[]).includes(hash) ? (hash as Route) : 'hoy'
}

/** Hash-based tabs: no router dependency and works under Firebase Hosting's SPA rewrite. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(readHash)

  useEffect(() => {
    const onChange = () => {
      setRoute(readHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

/** Query part of the hash, e.g. #shadowing?id=cafe-1 → { id: 'cafe-1' }. */
export function hashParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '')
}

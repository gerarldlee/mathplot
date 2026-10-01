import { useEffect, useRef, useState } from 'react'
import Home from './pages/Home'
import Docs from './pages/Docs'
import Playground from './playground/App'

type Route = 'home' | 'docs' | 'playground'

interface HashTarget {
  route: Route
  anchor: string | null
}

function parseHash(hash: string): HashTarget | null {
  // Bare in-page anchors (#fence) are not route commands; the browser
  // scrolls to the matching element by itself.
  if (!hash.startsWith('#/')) {
    return null
  }

  if (hash === '#/playground') {
    return { route: 'playground', anchor: null }
  }

  if (hash === '#/docs') {
    return { route: 'docs', anchor: null }
  }

  if (hash.startsWith('#/docs/')) {
    return { route: 'docs', anchor: hash.slice('#/docs/'.length) || null }
  }

  return { route: 'home', anchor: null }
}

export function Router() {
  const initial = parseHash(window.location.hash) ?? { route: 'home' as Route, anchor: null }
  const [route, setRoute] = useState<Route>(initial.route)
  // Counter-tagged anchor requests: set only from the hashchange handler, so
  // every navigation re-triggers the scroll effect (even repeat visits).
  const [anchorRequest, setAnchorRequest] = useState<{ anchor: string | null; id: number }>({
    anchor: initial.anchor,
    id: 0,
  })
  const routeRef = useRef(route)

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash(window.location.hash)
      if (!parsed) {
        return
      }

      if (parsed.route !== routeRef.current) {
        routeRef.current = parsed.route
        setRoute(parsed.route)
        window.scrollTo(0, 0)
      }

      if (parsed.anchor) {
        setAnchorRequest((previous) => ({ anchor: parsed.anchor, id: previous.id + 1 }))
      }
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (anchorRequest.anchor) {
      document.getElementById(anchorRequest.anchor)?.scrollIntoView()
    }
  }, [anchorRequest])

  if (route === 'docs') {
    return <Docs />
  }

  if (route === 'playground') {
    return <Playground />
  }

  return <Home />
}
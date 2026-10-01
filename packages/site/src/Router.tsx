import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Docs from './pages/Docs'
import Playground from './playground/App'

type Route = 'home' | 'docs' | 'playground'

function getRoute(): Route {
  const hash = window.location.hash
  if (hash === '#/playground') {
    return 'playground'
  }
  if (hash === '#/docs') {
    return 'docs'
  }
  return 'home'
}

export function Router() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(getRoute())
      window.scrollTo(0, 0)
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route === 'docs') {
    return <Docs />
  }

  if (route === 'playground') {
    return <Playground />
  }

  return <Home />
}
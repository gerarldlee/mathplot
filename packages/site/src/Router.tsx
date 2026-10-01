import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Playground from './playground/App'

function getRoute() {
  return window.location.hash === '#/playground' ? 'playground' : 'home'
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

  if (route === 'playground') {
    return <Playground />
  }

  return <Home />
}
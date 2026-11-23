import { useEffect, useState } from 'react'
import MapPage from './MapPage.jsx'
import SignIn from './pages/SignIn'

// Temporary: shows the map page directly until the team adds routing.
// Browsing works signed out; joining a game asks the user to sign in first.
function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  function handleSignedIn(signedInUser) {
    setUser(signedInUser)
    setShowSignIn(false)
  }

  if (checking) return <p>Checking your session...</p>

  if (showSignIn && !user) {
    return (
      <>
        <button type="button" onClick={() => setShowSignIn(false)}>
          ← Back to map
        </button>
        <SignIn onSignedIn={handleSignedIn} />
      </>
    )
  }

  return <MapPage user={user} onSignInNeeded={() => setShowSignIn(true)} />
}

export default App

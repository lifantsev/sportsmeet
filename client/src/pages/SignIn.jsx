import { useEffect, useRef, useState } from "react"
import { loadGoogleScript } from "../loadGoogleScript"

const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function SignIn() {
    const buttonRef = useRef(null)
    const [status, setStatus] = useState('loading') // 'loading', 'ready', 'error'
    const [signingIn, setSigningIn] = useState(false)
    const [error, setError] = useState(null)

    

    useEffect( () => {
        let cancelled = false
        // We define this inside the effect so that it can access the `cancelled` variable.
        async function handleCredentialResponse(response) {
            if (cancelled) return
            setError(null)

            if (!response?.credential) {
                setError('Google did not return a credential. Please try again.')
                return
            }

            setSigningIn(true)
            try {
                const res = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ credential: response.credential }),
                })
                if (cancelled) return
                if (!res.ok) throw new Error(`HTTP ${res.status}\nServer rejected sign-in`)

                // TODO: sign-in succeeded. Update auth state or navigate here.
            } catch (err) {
                if (!cancelled) setError('Sign-in failed. Please try again.')
            } finally {
                if (!cancelled) setSigningIn(false)
            }
        }

        if (!clientID) {
            setError('Google client ID is not configured (missing VITE_GOOGLE_CLIENT_ID).')
            setStatus('error')
            return
        }

        loadGoogleScript()
            .then(() => {
                if (cancelled || !buttonRef.current) return

                window.google.accounts.id.initialize({
                    client_id: clientID,
                    callback: handleCredentialResponse
                })

                buttonRef.current.innerHTML = '' // Avoid double-rendering the button if this effect runs again.
                window.google.accounts.id.renderButton(buttonRef.current, {
                    theme: "outline",
                    size: "large",
                    text: "signin_with"
                })

                setStatus('ready')
            })
            .catch(() => {
                if (cancelled) return
                setError("Couldn't load Google sign-in. Check your connection and refresh.")
                setStatus('error')
            })

        return () => { cancelled = true }
    }, [])

    return (
        <div style={{ maxWidth: 400, margin: '0 auto', padding: 32 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.05em' }}>sign in</h1>
            <p>Use your Google account to sign in.</p>

            {status === 'loading' && <p>Loading Google sign-in...</p>}
            {signingIn && <p>Signing you in...</p>}
            {error && <p role='alert' style={{ color: 'crimson' }}>{error}</p>}

            <div ref={buttonRef} style={{ display: 'inline-block' }} />
        </div>
    )
}

export default SignIn
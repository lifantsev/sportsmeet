// Calls the API and returns the parsed JSON (null for 204). Throws an Error with the server's
// message on failure, which the page shows as feedback.
export async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}))
    throw new Error(error || 'Something went wrong. Please try again.')
  }
  return res.status === 204 ? null : res.json()
}

export const gameUrl = (gameId) => `/api/games/${encodeURIComponent(gameId)}`

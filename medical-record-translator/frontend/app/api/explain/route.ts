export const maxDuration = 120

declare const process: { env: Record<string, string | undefined> }

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/api/reports/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    })

    const responseText = await response.text()
    let data: unknown

    try {
      data = JSON.parse(responseText)
    } catch {
      return Response.json(
        { error: 'The backend returned an invalid explanation response.' },
        { status: 502 },
      )
    }

    if (!response.ok) {
      const detail =
        typeof data === 'object' && data !== null && 'detail' in data
          ? String(data.detail)
          : 'Could not generate sample explanations.'
      return Response.json({ error: detail }, { status: response.status })
    }

    return Response.json(data)
  } catch (error) {
    console.error('[explain] Backend request failed:', error)
    return Response.json(
      { error: 'Could not connect to the explanation service.' },
      { status: 502 },
    )
  }
}

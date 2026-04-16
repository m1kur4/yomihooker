export const runtime = 'nodejs'

import { readConfigFile } from '@/lib/read-config'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const cfg = readConfigFile()
  const ankiPort =
    request.headers.get('X-Anki-Port') ?? String(cfg.anki_connect.port)
  const ankiUrl = `http://127.0.0.1:${ankiPort}`

  try {
    const response = await fetch(ankiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data: unknown = await response.json()
    return Response.json(data)
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to reach AnkiConnect',
      },
      { status: 502 },
    )
  }
}

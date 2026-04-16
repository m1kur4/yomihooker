export const runtime = 'nodejs'

import { readConfigFile } from '@/lib/read-config'

type TtsRequest = {
  text?: string
  voicevoxPort?: number
  speaker?: string
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as TtsRequest | null
  const text = payload?.text?.trim()

  if (!text) {
    return Response.json({ error: 'Text is required' }, { status: 400 })
  }

  const cfg = readConfigFile()
  const port = payload?.voicevoxPort ?? cfg.voicevox.port
  const speaker = payload?.speaker ?? cfg.voicevox.speaker
  const engineUrl = `http://127.0.0.1:${port}`

  try {
    const queryUrl = new URL('/audio_query', engineUrl)
    queryUrl.searchParams.set('speaker', speaker)
    queryUrl.searchParams.set('text', text)

    const queryResponse = await fetch(queryUrl, {
      method: 'POST',
      cache: 'no-store',
    })

    if (!queryResponse.ok) {
      throw new Error(`audio_query failed with status ${queryResponse.status}`)
    }

    const queryJson = await queryResponse.json()

    const synthesisUrl = new URL('/synthesis', engineUrl)
    synthesisUrl.searchParams.set('speaker', speaker)

    const synthesisResponse = await fetch(synthesisUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryJson),
      cache: 'no-store',
    })

    if (!synthesisResponse.ok) {
      throw new Error(
        `synthesis failed with status ${synthesisResponse.status}`,
      )
    }

    const audioBuffer = await synthesisResponse.arrayBuffer()

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('TTS synthesis failed:', error)

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to reach the local TTS engine',
      },
      { status: 502 },
    )
  }
}

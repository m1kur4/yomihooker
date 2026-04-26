'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Languages, Loader2, Trash2 } from 'lucide-react'

import { AudioPlayer } from '@/components/audioplayer'
import { Clipboard } from '@/components/clipboard'
import { MineButton } from '@/components/mine-button'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { MessageData } from '@/lib/message-data'
import { useDeckStats } from '@/lib/deck-stats-context'

type MessageState = MessageData & { translating?: boolean }
import {
  useSettings,
  lunaWsUrl,
  lunaTranslateUrl,
} from '@/lib/settings-context'

const TextDeck: React.FC<{ deckId: number; deckName: string }> = ({
  deckId,
  deckName,
}) => {
  const [messages, setMessages] = useState<MessageState[]>([])
  const { setCharCount } = useDeckStats()
  const { settings } = useSettings()

  useEffect(() => {
    const total = messages.reduce((sum, m) => sum + m.original.length, 0)
    setCharCount(total)
  }, [messages, setCharCount])

  const deleteMessage = async (messageId: number) => {
    const response = await fetch(`/api/decks/${deckId}/messages/${messageId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      console.error('Delete request failed:', response.status)
      return
    }

    setMessages((prevMessages) =>
      prevMessages.filter((message) => message.id !== messageId),
    )
  }

  useEffect(() => {
    let wsOriginal: WebSocket | null = null
    let isCancelled = false

    const syncMessages = async () => {
      try {
        const response = await fetch(`/api/decks/${deckId}/messages`)

        if (!response.ok) {
          throw new Error(`Messages request failed: ${response.status}`)
        }

        const persistedMessages = (await response.json()) as MessageData[]

        if (isCancelled) {
          return
        }

        const blank = persistedMessages.filter((m) => m.translation === '')
        setMessages(
          persistedMessages.map((m) =>
            m.translation === '' ? { ...m, translating: true } : m,
          ),
        )

        for (const msg of blank) {
          void (async () => {
            let translation = ''
            try {
              const res = await fetch(
                `${lunaTranslateUrl(settings.lunatranslatorPort)}?text=${encodeURIComponent(msg.original)}`,
              )
              if (!res.ok) throw new Error(`Translation request failed: ${res.status}`)
              const { result } = (await res.json()) as { result?: string }
              translation = result ?? ''
            } catch (error) {
              console.error('Translation fetch failed:', error)
            }

            try {
              await fetch(`/api/decks/${deckId}/messages/${msg.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ translation }),
              })
            } catch (error) {
              console.error('Translation persist failed:', error)
            }

            if (isCancelled) return
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msg.id ? { ...m, translation, translating: false } : m,
              ),
            )
          })()
        }
      } catch (error) {
        console.error('Messages fetch failed:', error)
      }

      if (isCancelled) {
        return
      }

      wsOriginal = new WebSocket(lunaWsUrl(settings.lunatranslatorPort))

      wsOriginal.onmessage = (event: MessageEvent<string>) => {
        const originalText = event.data
        const timestamp = new Date().toLocaleString('en-GB', {
          timeZone: 'Asia/Shanghai',
        })

        void (async () => {
          // Persist immediately with empty translation so original text appears at once
          let created: MessageState
          try {
            const response = await fetch(`/api/decks/${deckId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ original: originalText, translation: '', timestamp }),
            })
            if (!response.ok) {
              throw new Error(`Persist request failed: ${response.status}`)
            }
            created = { ...((await response.json()) as MessageData), translating: true }
          } catch (error) {
            console.error('Message persistence failed:', error)
            return
          }

          if (isCancelled) return
          setMessages((prev) => [...prev, created])

          // Fetch translation asynchronously
          let translation = ''
          try {
            const res = await fetch(
              `${lunaTranslateUrl(settings.lunatranslatorPort)}?text=${encodeURIComponent(originalText)}`,
            )
            if (!res.ok) throw new Error(`Translation request failed: ${res.status}`)
            const { result } = (await res.json()) as { result?: string }
            translation = result ?? ''
          } catch (error) {
            console.error('Translation fetch failed:', error)
          }

          // Update DB with translation
          try {
            await fetch(`/api/decks/${deckId}/messages/${created.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ translation }),
            })
          } catch (error) {
            console.error('Translation persist failed:', error)
          }

          if (isCancelled) return
          setMessages((prev) =>
            prev.map((m) =>
              m.id === created.id ? { ...m, translation, translating: false } : m,
            ),
          )
        })()
      }

      wsOriginal.onerror = (error) => console.error('Original WS Error:', error)
    }

    void syncMessages()

    return () => {
      isCancelled = true
      wsOriginal?.close()
    }
  }, [deckId, settings.lunatranslatorPort])

  const reversed = [...messages].reverse()
  const visible = reversed.slice(0, 10)
  const hidden = reversed.slice(10)
  const [olderOpen, setOlderOpen] = useState(false)

  return (
    <div style={styles.container}>
      <h1 className="mb-10 flex justify-center text-2xl font-bold tracking-tight text-indigo-600">
        {deckName}
      </h1>
      <Collapsible open={olderOpen} onOpenChange={setOlderOpen}>
        {visible.map((msg) => (
          <MessageCard
            key={msg.id}
            data={msg}
            translating={msg.translating ?? false}
            onDelete={() => deleteMessage(msg.id)}
          />
        ))}
        {hidden.length > 0 && (
          <>
            <CollapsibleContent>
              {hidden.map((msg) => (
                <MessageCard
                  key={msg.id}
                  data={msg}
                  translating={msg.translating ?? false}
                  onDelete={() => deleteMessage(msg.id)}
                />
              ))}
            </CollapsibleContent>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground w-full gap-1.5"
              >
                {olderOpen ? (
                  <>
                    <ChevronUp className="size-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-4" />
                    {hidden.length} older messages
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </>
        )}
      </Collapsible>
    </div>
  )
}

const MessageCard: React.FC<{
  data: MessageData
  translating: boolean
  onDelete: () => void
}> = ({ data, translating, onDelete }) => {
  const [showTranslation, setShowTranslation] = useState<boolean>(false)

  return (
    <div
      className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md"
      style={styles.card}
    >
      <div style={styles.cardHeader}>
        <div
          style={{
            color: '#666',
            fontSize: '0.8rem',
          }}
        >
          {data.timestamp}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <MineButton data={data} />
          <Clipboard text={data.original} label="Copy original text" />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: '10px 16px',
          alignItems: 'center',
        }}
      >
        <div style={styles.originalText}>
          {data.original.trimStart()}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setShowTranslation((prev) => !prev)}
            aria-label={
              showTranslation ? 'Hide translation' : 'Show translation'
            }
            style={{
              display: 'inline-flex',
              marginLeft: '8px',
              verticalAlign: 'middle',
              opacity: showTranslation ? 1 : 0.5,
            }}
          >
            <Languages />
          </Button>
        </div>

        <div style={styles.actions}>
          <AudioPlayer text={data.original} compact />

          <Button
            variant="destructive"
            size="icon-sm"
            onClick={onDelete}
            aria-label="Delete message"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {showTranslation && (
        <div
          style={{
            ...styles.translationText,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          {translating ? (
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Loader2 className="size-4 animate-spin" />
              Translating…
            </span>
          ) : (
            <>
              <span>{data.translation}</span>
              <Clipboard text={data.translation} label="Copy translation" />
            </>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  card: {},
  cardHeader: {
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  originalText: {
    fontSize: '18px',
    fontWeight: 'bold',
    lineHeight: '1.5',
  },
  translationText: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #666',
    fontSize: '16px',
    color: '#666',
  },
}

export default TextDeck

"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Languages, Trash2 } from "lucide-react";

import { AudioPlayer } from "@/components/audioplayer";
import { Clipboard } from "@/components/clipboard";
import { MineButton } from "@/components/mine-button";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { MessageData } from "@/lib/message-data";

const TextDeck: React.FC = () => {
  const [messages, setMessages] = useState<MessageData[]>([]);

  const messageIdCounter = useRef<number>(0);
  const deleteMessage = async (messageId: number) => {
    const response = await fetch(`/api/messages/${messageId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      console.error("Delete request failed:", response.status);
      return;
    }

    setMessages((prevMessages) =>
      prevMessages.filter((message) => message.id !== messageId),
    );
  };

  useEffect(() => {
    let wsOriginal: WebSocket | null = null;
    let isCancelled = false;

    const syncMessages = async () => {
      try {
        const response = await fetch("/api/messages");

        if (!response.ok) {
          throw new Error(`Messages request failed: ${response.status}`);
        }

        const persistedMessages = (await response.json()) as MessageData[];

        if (isCancelled) {
          return;
        }

        setMessages(persistedMessages);
        messageIdCounter.current =
          persistedMessages.reduce(
            (maxId, message) => Math.max(maxId, message.id),
            -1,
          ) + 1;
      } catch (error) {
        console.error("Messages fetch failed:", error);
      }

      if (isCancelled) {
        return;
      }

      wsOriginal = new WebSocket("ws://localhost:2333/api/ws/text/origin");

      wsOriginal.onmessage = async (event: MessageEvent<string>) => {
        const originalText = event.data;

        let translation = "";

        try {
          const response = await fetch(
            `http://127.0.0.1:2333/api/translate?text=${encodeURIComponent(originalText)}`,
          );

          if (!response.ok) {
            throw new Error(`Translation request failed: ${response.status}`);
          }

          const { result } = (await response.json()) as { result?: string };
          translation = result ?? "";
        } catch (error) {
          console.error("Translation fetch failed:", error);
        }

        const newMessage: MessageData = {
          id: messageIdCounter.current++,
          original: originalText,
          translation,
          timestamp: new Date().toLocaleString("en-GB", {
            timeZone: "Asia/Shanghai",
          }),
        };

        try {
          const response = await fetch("/api/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newMessage),
          });

          if (!response.ok) {
            throw new Error(`Persist request failed: ${response.status}`);
          }
        } catch (error) {
          console.error("Message persistence failed:", error);
          return;
        }

        if (isCancelled) {
          return;
        }

        setMessages((prevMessages) => [...prevMessages, newMessage]);
      };

      wsOriginal.onerror = (error) =>
        console.error("Original WS Error:", error);
    };

    void syncMessages();

    return () => {
      isCancelled = true;
      wsOriginal?.close();
    };
  }, []);

  const reversed = [...messages].reverse();
  const visible = reversed.slice(0, 10);
  const hidden = reversed.slice(10);
  const [olderOpen, setOlderOpen] = useState(false);

  return (
    <div style={styles.container}>
      <Collapsible open={olderOpen} onOpenChange={setOlderOpen}>
          {visible.map((msg) => (
            <MessageCard
              key={msg.id}
              data={msg}
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
                    onDelete={() => deleteMessage(msg.id)}
                  />
                ))}
              </CollapsibleContent>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-muted-foreground"
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
  );
};

const MessageCard: React.FC<{
  data: MessageData;
  onDelete: () => void;
}> = ({ data, onDelete }) => {
  const [showTranslation, setShowTranslation] = useState<boolean>(false);

  return (
    <div
      className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md"
      style={styles.card}
    >
      <div style={styles.cardHeader}>
        <div
          style={{
            color: "#666",
            fontSize: "0.8rem",
          }}
        >
          {data.timestamp}
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <MineButton data={data} />
          <Clipboard text={data.original} label="Copy original text" />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "10px 16px",
          alignItems: "center",
        }}
      >
        <div style={styles.originalText}>
          {data.original.trimStart()}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setShowTranslation((prev) => !prev)}
            aria-label={showTranslation ? "Hide translation" : "Show translation"}
            style={{ display: "inline-flex", marginLeft: "8px", verticalAlign: "middle", opacity: showTranslation ? 1 : 0.5 }}
          >
            <Languages />
          </Button>
        </div>

        <div style={styles.actions}>
          <AudioPlayer text={data.original} compact filename={data.timestamp} />

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
        <div style={{ ...styles.translationText, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <span>{data.translation}</span>
          <Clipboard text={data.translation} label="Copy translation" />
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "sans-serif",
  },
  card: {},
  cardHeader: {
    marginBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  originalText: {
    fontSize: "18px",
    fontWeight: "bold",
    lineHeight: "1.5",
  },
  translationText: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #666",
    fontSize: "16px",
    color: "#666",
  },
};

export default TextDeck;

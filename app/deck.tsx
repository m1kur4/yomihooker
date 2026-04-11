"use client";

import React, { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

export interface MessageData {
  id: number;
  original: string;
  translation: string;
  timestamp: string;
}

const DualWebSocketList: React.FC = () => {
  const [messages, setMessages] = useState<MessageData[]>([]);

  const messageIdCounter = useRef<number>(0);

  useEffect(() => {
    // 替换为你的真实 WebSocket 地址
    const wsOriginal = new WebSocket("ws://localhost:2333/api/ws/text/origin");

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

      // 更新状态，将新消息追加到列表中
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    };

    wsOriginal.onerror = (error) => console.error("Original WS Error:", error);

    // 组件卸载时关闭连接，防止内存泄漏
    return () => {
      wsOriginal.close();
    };
  }, []);

  return (
    <div style={styles.container}>
      {messages.length === 0 ? (
        <p>Waiting for message...</p>
      ) : (
        messages.map((msg) => <MessageItem key={msg.id} data={msg} />)
      )}
    </div>
  );
};

const MessageItem: React.FC<{ data: MessageData }> = ({ data }) => {
  const [showTranslation, setShowTranslation] = useState<boolean>(false);

  return (
    <div
      className="border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md"
      style={styles.card}
    >
      <div
        style={{
          color: "#666",
          fontSize: "0.8rem",
        }}
      >
        {data.timestamp}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "10px 16px",
          alignItems: "center",
        }}
      >
        <div style={styles.originalText}>{data.original}</div>

        <Button
          variant="outline"
          // style={styles.button}
          onClick={() => setShowTranslation((prev) => !prev)}
        >
          {showTranslation ? "Hide" : "Trans"}
        </Button>
      </div>

      {showTranslation && (
        <div style={styles.translationText}>{data.translation}</div>
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
  button: {
    padding: "6px 12px",
    fontSize: "14px",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
  },
};

export default DualWebSocketList;

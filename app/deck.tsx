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

  // 使用 useRef 维护消息队列，避免触发不必要的重新渲染
  const originalQueue = useRef<string[]>([]);
  const translationQueue = useRef<string[]>([]);
  const messageIdCounter = useRef<number>(0);

  // 同步队列的方法：只要两个队列中都有数据，就将它们成对提取出来
  const processQueues = () => {
    // 只有当原文和译文都至少有一条时才进行组合
    if (
      originalQueue.current.length > 0 &&
      translationQueue.current.length > 0
      //  || (originalQueue.current.length > 0 && translationQueue.current.length == 0)
    ) {
      const original = originalQueue.current.shift()!;
      const translation = translationQueue.current.shift()!;

      const newMessage: MessageData = {
        id: messageIdCounter.current++,
        original,
        translation,
        timestamp: new Date().toLocaleString("en-GB", {
          timeZone: "Asia/Shanghai",
        }),
      };

      // 更新状态，将新消息追加到列表中
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    }
  };

  useEffect(() => {
    // 替换为你的真实 WebSocket 地址
    const wsOriginal = new WebSocket("ws://localhost:2333/api/ws/text/origin");
    const wsTranslation = new WebSocket(
      "ws://localhost:2333/api/ws/text/trans",
    );

    wsOriginal.onmessage = (event: MessageEvent) => {
      originalQueue.current.push(event.data);
      processQueues();
    };

    wsTranslation.onmessage = (event: MessageEvent) => {
      translationQueue.current.push(event.data);
      processQueues();
    };

    // 错误处理（可选）
    wsOriginal.onerror = (error) => console.error("Original WS Error:", error);
    wsTranslation.onerror = (error) =>
      console.error("Translation WS Error:", error);

    // 组件卸载时关闭连接，防止内存泄漏
    return () => {
      wsOriginal.close();
      wsTranslation.close();
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
    fontSize: "15px",
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

import React, { useEffect, useState, useRef, useCallback } from "react";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export default function Chatbot() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text:
        "Hello! I am your instructor. Ask me about Data Structures, Algorithms, placement preparation, or NPTEL courses.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef(null);
  const chatWindowRef = useRef(null);

  // Use backend proxy to avoid exposing API keys from the client.
  const apiUrl = 'http://localhost:5000/api/chat'

  

  // scroll to bottom on updates
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // auto-expand textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onInput = () => {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    };
    ta.addEventListener("input", onInput);
    onInput();
    return () => ta.removeEventListener("input", onInput);
  }, [prompt]);

  const sendMessage = useCallback(async () => {
    const userQuery = prompt.trim();
    if (!userQuery) return;

    setMessages((m) => [...m, { from: "user", text: userQuery }]);
    setPrompt("");
    if (textareaRef.current) textareaRef.current.focus();
    setLoading(true);

    let botIndex = null;

    setMessages((m) => {
      const copy = [...m];
      botIndex = copy.length;
      copy.push({ from: "bot", text: "" });
      return copy;
    });

    try {
      // Send prompt to backend proxy. Backend will call the Generative API.
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userQuery }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => null);
        setMessages((m) => {
          const copy = [...m];
          copy[botIndex] = {
            from: "bot-error",
            text: `Server error ${response.status}${errBody ? ': ' + errBody : ''}`,
          };
          return copy;
        });
        setLoading(false);
        return;
      }

      const data = await response.json();
      const text = data?.text || data?.message || data?.output || "No response text";
      setMessages((m) => {
        const copy = [...m];
        copy[botIndex] = { from: "bot", text };
        return copy;
      });
    } catch (error) {
      setMessages((m) => {
        const copy = [...m];
        copy[botIndex] = {
          from: "bot-error",
          text: "Error: " + error.message,
        };
        return copy;
      });
    }

    setLoading(false);
  }, [prompt, apiUrl]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const renderMessage = (msg) => {
    const style = {
      padding: 10,
      borderRadius: 8,
      maxWidth: "80%",
      whiteSpace: "pre-wrap",
    };

    if (msg.from === "user")
      return (
        <div style={{ ...style, background: "#06b6d4", color: "#fff" }}>
          {msg.text}
        </div>
      );

    if (msg.from === "bot") {
      const html = marked.parse(msg.text || "");
      return (
        <div
          style={{ ...style, background: "#e6eef8", color: "#0f172a" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return (
      <div style={{ ...style, background: "#fee2e2", color: "#991b1b" }}>
        {msg.text}
      </div>
    );
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "12px auto" }}>
      <div
        style={{
          background: "#0f172a",
          padding: 16,
          borderRadius: 12,
          height: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 style={{ color: "#06b6d4" }}>🤖 DSA / Placement Chatbot</h2>

        <div
          ref={chatWindowRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 8,
            background: "#020617",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: 12,
                display: "flex",
                justifyContent: m.from === "user" ? "flex-end" : "flex-start",
              }}
            >
              {renderMessage(m)}
            </div>
          ))}

          {loading && (
            <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
              Typing…
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything about DSA, placements..."
          rows={1}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            resize: "none",
            maxHeight: "150px",
          }}
        />

        <button
          onClick={() => sendMessage()}
          disabled={loading || !prompt.trim()}
          style={{
            marginTop: 8,
            padding: "10px 16px",
            borderRadius: 8,
            background: "#06b6d4",
            color: "#fff",
            border: "none",
          }}
        >
          {loading ? "Thinking…" : "Send"}
        </button>
      </div>
    </div>
  );
}

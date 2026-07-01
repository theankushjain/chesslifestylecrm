import { useEffect, useRef, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Who hasn't paid fees this month?",
  "Which leads need follow-up today?",
  "Show me all advanced students",
  "How many leads are in trial stage?",
];

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello — I'm your CRM assistant. Ask me anything about your students, leads or fees." }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => `sess-${Date.now()}`);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const { data } = await api.post("/chat", { message: text, session_id: sessionId });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      toast.error(formatApiError(e));
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — I hit an error. Try again." }]);
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen">
      <div className="p-4 md:p-8 border-b border-border/60 bg-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand" />
          <div className="label-over">AI Assistant</div>
        </div>
        <h1 className="text-3xl md:text-4xl font-serif">Ask about your academy</h1>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 max-w-3xl mx-auto w-full" data-testid="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-border/60"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-border/60 px-4 py-3 text-sm text-muted-foreground animate-pulse">
              Thinking...
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="pt-4">
            <div className="label-over mb-2">Try asking</div>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)} data-testid={`suggestion-${i}`}
                  className="text-left text-sm p-3 bg-white border border-border/60 hover:bg-secondary transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 bg-white p-3 md:p-4">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="max-w-3xl mx-auto flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..."
            data-testid="chat-input" disabled={sending}
            className="rounded-none" />
          <Button type="submit" disabled={sending || !input.trim()} data-testid="chat-send" className="rounded-none">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

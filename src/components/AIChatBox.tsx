import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

type Message = { role: string; content: string };

interface AIChatBoxProps {
  projectId: string; // now we only need projectId
}

export function AIChatBox({ projectId }: AIChatBoxProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your production AI assistant. Ask me anything about your project - budgets, schedules, risks, or team status.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;

    const newMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, newMessage]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          project_id: projectId, // only send project_id now
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "No reply from AI." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error contacting server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Ask AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`
            space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30
            hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50
            dark:[&::-webkit-scrollbar-track]:bg-transparent
            dark:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40
            dark:hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60
          `}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="text-sm prose prose-sm dark:prose-invert">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg p-3 bg-muted text-foreground max-w-[20%]">
                <div className="flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-150">●</span>
                  <span className="animate-bounce delay-300">●</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ask about cost variance, schedule risks, crew status..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon" disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

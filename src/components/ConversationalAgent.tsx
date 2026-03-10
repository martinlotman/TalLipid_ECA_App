import { Volume2, Send, Square, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHealthChat } from "@/hooks/useHealthChat";
import ReactMarkdown from "react-markdown";

const ConversationalAgent = () => {
  const { messages, isStreaming, sendMessage, stopStreaming, clearChat } = useHealthChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="flex flex-col items-center gap-3 p-4">
        {/* Avatar area — video element ready for external avatar stream */}
        <div className="relative w-full">
          {/* LiveAvatar embed */}
          <div className="relative mx-auto w-full overflow-hidden rounded-2xl border-[3px] border-primary/30 shadow-lg" style={{ aspectRatio: "16/9" }}>
            <iframe
              src="https://embed.liveavatar.com/v1/aa9f0c42-51c0-47db-acd7-d8b7a1f6f283"
              allow="microphone"
              title="LiveAvatar Embed"
              className="h-full w-full border-0"
            />
          </div>

          {/* Status dot */}
          <span
            className={`absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-card transition-colors ${
              isStreaming ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
            }`}
          />
        </div>

        {/* State label */}
        <div className="flex items-center gap-2">
          {isStreaming && <Volume2 className="h-4 w-4 animate-pulse text-primary" />}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isStreaming ? "Speaking" : "Health Assistant"}
          </span>
          {hasMessages && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={clearChat}
              title="Clear conversation"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Chat messages */}
        {hasMessages && (
          <ScrollArea className="w-full max-h-48 rounded-xl bg-muted/30 p-3">
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "text-right text-foreground/70"
                      : "text-left text-foreground/90"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="inline-block rounded-xl bg-primary/10 px-3 py-1.5">
                      {msg.content}
                    </span>
                  )}
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="text-sm text-muted-foreground animate-pulse">Thinking…</div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}

        {/* Welcome prompt when no messages */}
        {!hasMessages && (
          <div className="w-full rounded-xl bg-muted/40 px-4 py-3 text-center">
            <p className="text-sm leading-relaxed text-foreground/80">
              Ask me about your health data, medications, or wellness tips!
            </p>
          </div>
        )}

        {/* Input area */}
        <div className="flex w-full gap-2">
          <Input
            placeholder="Ask your health assistant…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            className="flex-1 rounded-xl"
          />
          {isStreaming ? (
            <Button
              variant="destructive"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0"
              onClick={stopStreaming}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Video avatar integration ready — plug in D-ID, HeyGen, or Simli adapter
        </p>
      </CardContent>
    </Card>
  );
};

export default ConversationalAgent;

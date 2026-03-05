import { MessageCircle, Mic, Send } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ecaAvatar from "@/assets/eca-avatar.png";

interface Message {
  id: number;
  text: string;
  sender: "agent" | "user";
}

const ConversationalAgent = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi! I'm your health assistant. How are you feeling today?",
      sender: "agent",
    },
  ]);
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), text: input, sender: "user" };
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: Date.now() + 1,
        text: "Thanks for sharing! This is a mockup — the conversational agent backend will be connected soon.",
        sender: "agent",
      },
    ]);
    setInput("");
  };

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader
        className="cursor-pointer p-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={ecaAvatar}
              alt="Health assistant avatar"
              className="h-12 w-12 rounded-full border-2 border-primary/30 object-cover"
            />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-success" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm">Health Assistant</CardTitle>
            <p className="text-xs text-muted-foreground">Online • Tap to chat</p>
          </div>
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 p-4 pt-0">
          {/* Chat messages */}
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="shrink-0" disabled>
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="text-sm"
            />
            <Button size="icon" className="shrink-0" onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            Mockup — ECA backend integration pending
          </p>
        </CardContent>
      )}
    </Card>
  );
};

export default ConversationalAgent;

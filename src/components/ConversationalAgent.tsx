import { Mic, MicOff, Volume2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ecaAvatar from "@/assets/eca-avatar.png";

type AgentState = "idle" | "listening" | "thinking" | "speaking";

const ConversationalAgent = () => {
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [caption, setCaption] = useState("Tap the mic to start talking");
  const [mouthOpen, setMouthOpen] = useState(false);

  // Simulate lip-sync animation when speaking
  useEffect(() => {
    if (agentState !== "speaking") {
      setMouthOpen(false);
      return;
    }
    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 120 + Math.random() * 100);
    return () => clearInterval(interval);
  }, [agentState]);

  const handleMicPress = useCallback(() => {
    if (agentState === "idle") {
      setAgentState("listening");
      setCaption("Listening…");
      // Simulate: after 3s switch to thinking, then speaking
      setTimeout(() => {
        setAgentState("thinking");
        setCaption("Thinking…");
        setTimeout(() => {
          setAgentState("speaking");
          setCaption(
            "Remember to take your evening medication with a full glass of water."
          );
          setTimeout(() => {
            setAgentState("idle");
            setCaption("Tap the mic to start talking");
          }, 4000);
        }, 1500);
      }, 3000);
    } else {
      setAgentState("idle");
      setCaption("Tap the mic to start talking");
    }
  }, [agentState]);

  const isActive = agentState !== "idle";

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="flex flex-col items-center gap-4 p-5">
        {/* Avatar with lip-sync overlay */}
        <div className="relative">
          {/* Glow ring when active */}
          <div
            className={`absolute -inset-2 rounded-full transition-all duration-500 ${
              agentState === "speaking"
                ? "animate-pulse bg-primary/20"
                : agentState === "listening"
                  ? "animate-pulse bg-accent/30"
                  : "bg-transparent"
            }`}
          />

          {/* Avatar container */}
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-[3px] border-primary/30 shadow-lg">
            <img
              src={ecaAvatar}
              alt="Health assistant avatar"
              className="h-full w-full object-cover"
            />

            {/* Lip-sync overlay — semi-transparent mouth movement */}
            {agentState === "speaking" && (
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
                <div
                  className="rounded-t-full bg-[hsl(var(--foreground)/0.08)] backdrop-blur-[1px] transition-all duration-100"
                  style={{
                    width: mouthOpen ? "28px" : "18px",
                    height: mouthOpen ? "14px" : "5px",
                  }}
                />
              </div>
            )}
          </div>

          {/* Status indicator */}
          <span
            className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-card transition-colors ${
              agentState === "idle"
                ? "bg-muted-foreground"
                : agentState === "listening"
                  ? "bg-destructive animate-pulse"
                  : "bg-success"
            }`}
          />
        </div>

        {/* State label */}
        <div className="flex items-center gap-2">
          {agentState === "speaking" && (
            <Volume2 className="h-4 w-4 animate-pulse text-primary" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {agentState === "idle"
              ? "Health Assistant"
              : agentState === "listening"
                ? "Listening"
                : agentState === "thinking"
                  ? "Thinking"
                  : "Speaking"}
          </span>
        </div>

        {/* Caption / transcript bubble */}
        <div className="w-full rounded-xl bg-muted/40 px-4 py-3 text-center">
          <p className="text-sm leading-relaxed text-foreground/80">
            {caption}
          </p>
        </div>

        {/* Mic button */}
        <Button
          variant={isActive ? "destructive" : "default"}
          size="lg"
          className="h-14 w-14 rounded-full shadow-md"
          onClick={handleMicPress}
        >
          {isActive ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          Mockup — lip-sync service integration pending
        </p>
      </CardContent>
    </Card>
  );
};

export default ConversationalAgent;

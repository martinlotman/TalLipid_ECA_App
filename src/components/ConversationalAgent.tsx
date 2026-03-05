import { Mic, MicOff, Volume2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ecaIdle from "@/assets/eca-avatar.png";
import ecaSpeaking from "@/assets/eca-avatar-speaking.png";

type AgentState = "idle" | "listening" | "thinking" | "speaking";

const ConversationalAgent = () => {
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [caption, setCaption] = useState("Tap the mic to start talking");
  const [frame, setFrame] = useState(0);

  // Animate between the two frames to simulate a .gif
  useEffect(() => {
    const speed = agentState === "speaking" ? 600 : 2000;
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 2);
    }, speed);
    return () => clearInterval(interval);
  }, [agentState]);

  const handleMicPress = useCallback(() => {
    if (agentState === "idle") {
      setAgentState("listening");
      setCaption("Listening…");
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
  const currentImage = frame === 0 ? ecaIdle : ecaSpeaking;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="flex flex-col items-center gap-4 p-5">
        {/* Square avatar container with animated .gif-like effect */}
        <div className="relative">
          {/* Glow behind avatar */}
          <div
            className={`absolute -inset-2 rounded-2xl transition-all duration-500 ${
              agentState === "speaking"
                ? "animate-pulse bg-primary/20"
                : agentState === "listening"
                  ? "animate-pulse bg-accent/30"
                  : "bg-transparent"
            }`}
          />

          <div
            className="relative h-40 w-40 overflow-hidden rounded-2xl border-[3px] border-primary/30 shadow-lg"
            style={{
              animation:
                agentState === "speaking"
                  ? "avatar-bob 0.6s ease-in-out infinite"
                  : "avatar-breathe 3s ease-in-out infinite",
            }}
          >
            {/* Crossfade between two images */}
            <img
              src={ecaIdle}
              alt="Health assistant"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
              style={{ opacity: frame === 0 ? 1 : 0 }}
            />
            <img
              src={ecaSpeaking}
              alt="Health assistant speaking"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
              style={{ opacity: frame === 1 ? 1 : 0 }}
            />
          </div>

          {/* Status dot */}
          <span
            className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card transition-colors ${
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

        {/* Caption */}
        <div className="w-full rounded-xl bg-muted/40 px-4 py-3 text-center">
          <p className="text-sm leading-relaxed text-foreground/80">{caption}</p>
        </div>

        {/* Mic button */}
        <Button
          variant={isActive ? "destructive" : "default"}
          size="lg"
          className="h-14 w-14 rounded-full shadow-md"
          onClick={handleMicPress}
        >
          {isActive ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          Mockup — lip-sync service integration pending
        </p>
      </CardContent>
    </Card>
  );
};

export default ConversationalAgent;

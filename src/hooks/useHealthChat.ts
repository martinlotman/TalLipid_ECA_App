import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Avatar service adapter interface.
 * When the external video-stream avatar is ready, implement this interface
 * and pass it to useHealthChat via setAvatarAdapter().
 */
export interface AvatarAdapter {
  connect(): Promise<MediaStream | string>;
  speak(text: string): Promise<void>;
  interrupt(): void;
  disconnect(): Promise<void>;
  state: "disconnected" | "connecting" | "idle" | "speaking";
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`;

export function useHealthChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [avatarAdapter, setAvatarAdapter] = useState<AvatarAdapter | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  /** Create a new conversation row if one doesn't exist yet */
  const ensureConversation = useCallback(async () => {
    if (conversationIdRef.current || !user) return conversationIdRef.current;
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
    conversationIdRef.current = data.id;
    return data.id;
  }, [user]);

  /** Persist a single message to the database */
  const persistMessage = useCallback(
    async (conversationId: string, role: "user" | "assistant", content: string) => {
      if (!user) return;
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content,
      });
    },
    [user]
  );

  const sendMessage = useCallback(
    async (input: string) => {
      const userMsg: ChatMessage = { role: "user", content: input };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsStreaming(true);

      // Persist user message
      const convId = await ensureConversation();
      if (convId) {
        persistMessage(convId, "user", input);
      }

      let assistantSoFar = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: updatedMessages }),
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          const errorData = await resp.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed (${resp.status})`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Persist completed assistant response
        if (convId && assistantSoFar) {
          persistMessage(convId, "assistant", assistantSoFar);
        }

        // Send to avatar if connected
        if (avatarAdapter && assistantSoFar) {
          avatarAdapter.speak(assistantSoFar).catch(console.error);
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Chat error:", e);
          toast.error(e.message || "Failed to get response");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, avatarAdapter, ensureConversation, persistMessage]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    avatarAdapter?.interrupt();
  }, [avatarAdapter]);

  const clearChat = useCallback(async () => {
    // End current conversation
    if (conversationIdRef.current && user) {
      await supabase
        .from("chat_conversations")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", conversationIdRef.current);
    }
    conversationIdRef.current = null;
    setMessages([]);
  }, [user]);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearChat,
    setAvatarAdapter,
    avatarAdapter,
  };
}

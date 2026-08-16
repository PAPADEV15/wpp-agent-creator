import { useRef, useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runAgentMessage } from "@/lib/agent.functions";
import { MAX_HISTORY_MESSAGES, type ConversationMessage } from "@/domain/runtime";
import type { AgentConfig } from "@/domain/agent";
import { agentConfigSchema } from "@/domain/agent";

export function AgentTestChat({ agentId, config }: { agentId: string; config: AgentConfig }) {
  const runAgent = useServerFn(runAgentMessage);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "test-session",
  );

  const ready = agentConfigSchema.safeParse(config).success;

  async function send() {
    const message = input.trim();
    if (!message || loading) return;

    const history = messages.slice(-MAX_HISTORY_MESSAGES);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const result = await runAgent({
        data: { agentId, message, conversationId: conversationId.current, history, config },
      });
      if (result.ok) {
        setMessages((m) => [...m, { role: "assistant", content: result.message }]);
      } else {
        setError(result.message);
      }
    } catch {
      setError(
        "Não foi possível obter uma resposta. Verifique a configuração do agente e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <MessageCircle className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{config.persona.name || "Seu agente"}</p>
          <p className="text-xs text-muted-foreground">
            {config.business.name || "Seu negócio"}
          </p>
        </div>
      </div>

      <div className="max-h-[360px] min-h-[140px] space-y-2.5 overflow-y-auto text-sm">
        {messages.length === 0 && !loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Envie uma mensagem para testar seu agente.
          </p>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2 text-secondary-foreground"
                : "ml-auto max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tr-sm px-3.5 py-2 text-primary-foreground"
            }
            style={m.role === "assistant" ? { background: "var(--gradient-primary)" } : undefined}
          >
            {m.content}
          </div>
        ))}
        {loading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Agente está pensando...
          </p>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
      {!ready ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Complete as etapas de negócio, agente e conhecimento para testar.
        </p>
      ) : null}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva uma mensagem..."
          disabled={loading || !ready}
          aria-label="Mensagem de teste"
        />
        <Button type="submit" disabled={loading || !ready || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">
        Teste real: usa a configuração atual do agente e o provedor de IA do servidor.
      </p>
    </div>
  );
}

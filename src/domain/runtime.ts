/**
 * Domínio do runtime do agente — contratos independentes de UI e de provedor.
 */
import { z } from "zod";

import { agentConfigSchema } from "./agent";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_MESSAGES = 20;

export const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const runAgentInputSchema = z.object({
  agentId: z.string().trim().min(1),
  message: z.string().trim().min(1, "Escreva uma mensagem").max(MAX_MESSAGE_LENGTH),
  conversationId: z.string().trim().min(1).max(120).optional(),
  history: z.array(conversationMessageSchema).max(MAX_HISTORY_MESSAGES).optional(),
  /** Configuração do agente sendo testado (rascunho ainda não persistido). */
  config: agentConfigSchema.optional(),
});
export type RunAgentInput = z.infer<typeof runAgentInputSchema>;

export type RunAgentResult = {
  message: string;
  provider: string;
  model?: string | undefined;
  usage?: { inputTokens?: number | undefined; outputTokens?: number | undefined } | undefined;
};

export const RUNTIME_ERROR_CODES = [
  "AGENT_NOT_FOUND",
  "INVALID_AGENT_CONFIG",
  "INVALID_INPUT",
  "AI_PROVIDER_NOT_CONFIGURED",
  "UNSUPPORTED_AI_PROVIDER",
  "AI_AUTHENTICATION_ERROR",
  "AI_RATE_LIMIT",
  "AI_TIMEOUT",
  "AI_PROVIDER_ERROR",
  "INVALID_AI_RESPONSE",
  "AGENT_RUNTIME_ERROR",
] as const;
export type RuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[number];

/** Mensagens amigáveis, sem detalhes técnicos. */
export const RUNTIME_ERROR_MESSAGES: Record<RuntimeErrorCode, string> = {
  AGENT_NOT_FOUND: "Agente não encontrado. Configure o agente antes de testar.",
  INVALID_AGENT_CONFIG:
    "A configuração do agente está incompleta. Revise as etapas do assistente.",
  INVALID_INPUT: "Mensagem inválida. Escreva algo antes de enviar.",
  AI_PROVIDER_NOT_CONFIGURED:
    "O provedor de IA ainda não está configurado no servidor.",
  UNSUPPORTED_AI_PROVIDER: "Provedor de IA não suportado.",
  AI_AUTHENTICATION_ERROR: "Falha de autenticação com o provedor de IA.",
  AI_RATE_LIMIT:
    "O limite temporário do provedor foi atingido. Tente novamente em alguns instantes.",
  AI_TIMEOUT: "O provedor demorou demais para responder. Tente novamente.",
  AI_PROVIDER_ERROR: "O provedor de IA está indisponível no momento.",
  INVALID_AI_RESPONSE: "Não foi possível obter uma resposta do agente.",
  AGENT_RUNTIME_ERROR:
    "Não foi possível obter uma resposta. Verifique a configuração do agente e tente novamente.",
};

export class AgentRuntimeError extends Error {
  constructor(readonly code: RuntimeErrorCode) {
    super(RUNTIME_ERROR_MESSAGES[code]);
    this.name = "AgentRuntimeError";
  }
}

export function isRuntimeErrorCode(value: unknown): value is RuntimeErrorCode {
  return typeof value === "string" && (RUNTIME_ERROR_CODES as readonly string[]).includes(value);
}

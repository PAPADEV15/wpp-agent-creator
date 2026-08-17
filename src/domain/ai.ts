/**
 * Domínio de IA — contratos genéricos de provedor.
 * Nenhum SDK/detalhe de provedor específico pode aparecer aqui.
 */
import { z } from "zod";

export const AI_PROVIDERS = [
  { id: "gemini", label: "Google Gemini", hint: "Único provedor disponível nesta fase" },
] as const;
export type AIProviderId = (typeof AI_PROVIDERS)[number]["id"];

/** Modelos suportados por provedor. A UI nunca escreve o nome do modelo. */
export const AI_MODELS: Record<AIProviderId, readonly string[]> = {
  gemini: ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-pro-latest"],
};

export const DEFAULT_AI_MODEL: Record<AIProviderId, string> = {
  gemini: "gemini-3.5-flash",
};

export const aiConfigSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS.map((p) => p.id) as [AIProviderId, ...AIProviderId[]], {
      errorMap: () => ({ message: "Provedor de IA inválido" }),
    }),
    model: z.string().trim().min(1, "Selecione um modelo"),
    temperature: z.number().min(0).max(2).optional(),
  })
  .refine((v) => AI_MODELS[v.provider].includes(v.model), {
    message: "Modelo não suportado por este provedor",
    path: ["model"],
  });

export type AIConfig = z.infer<typeof aiConfigSchema>;

export const defaultAIConfig: AIConfig = {
  provider: "gemini",
  model: DEFAULT_AI_MODEL.gemini,
};

/** Contratos de execução — implementados apenas no servidor. */
export type AIMessage = { role: "user" | "assistant"; content: string };

export type AIRequest = {
  system?: string;
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AIUsage = { inputTokens?: number | undefined; outputTokens?: number | undefined };

export const AI_ERROR_CODES = [
  "missing_api_key",
  "invalid_provider",
  "invalid_model",
  "invalid_config",
  "auth_error",
  "rate_limited",
  "temporary_error",
  "unknown_error",
] as const;
export type AIErrorCode = (typeof AI_ERROR_CODES)[number];

/** Mensagens seguras para exibir na UI (sem stack trace, sem dados sensíveis). */
export const AI_ERROR_MESSAGES: Record<AIErrorCode, string> = {
  missing_api_key: "A chave do provedor de IA não está configurada no servidor.",
  invalid_provider: "Provedor de IA não suportado.",
  invalid_model: "Modelo de IA não suportado.",
  invalid_config: "Configuração de IA inválida.",
  auth_error: "Falha de autenticação com o provedor de IA.",
  rate_limited: "Limite de requisições atingido. Tente novamente em instantes.",
  temporary_error: "O provedor de IA está indisponível no momento.",
  unknown_error: "Não foi possível concluir a requisição de IA.",
};

export class AIProviderError extends Error {
  constructor(
    readonly code: AIErrorCode,
    readonly provider: AIProviderId,
  ) {
    super(AI_ERROR_MESSAGES[code]);
    this.name = "AIProviderError";
  }
}

export type AIResponse = {
  text: string;
  provider: AIProviderId;
  model: string;
  usage?: AIUsage;
};

/** Abstração que o restante da aplicação consome. */
export interface AIProvider {
  readonly id: AIProviderId;
  readonly defaultModel: string;
  generateResponse(request: AIRequest): Promise<AIResponse>;
}

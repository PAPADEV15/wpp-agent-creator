/**
 * AgentRuntime — a ponte entre AgentConfig e o provedor de IA.
 * Server-only. Não conhece Gemini: fala apenas com a abstração AIProvider.
 */
import { AI_PROVIDERS, AIProviderError, type AIErrorCode } from "@/domain/ai";
import {
  AgentRuntimeError,
  runAgentInputSchema,
  type RunAgentInput,
  type RunAgentResult,
} from "@/domain/runtime";
import { createAIProvider, isAIProviderConfigured } from "@/lib/ai/index.server";
import { loadAgentConfig } from "./agent-source.server";
import { buildConversation, buildSystemPrompt } from "./prompt-builder";

const TIMEOUT_MS = 45_000;

const AI_ERROR_MAP: Record<AIErrorCode, Parameters<typeof AgentRuntimeError>[0] extends never ? never : ConstructorParameters<typeof AgentRuntimeError>[0]> = {
  missing_api_key: "AI_PROVIDER_NOT_CONFIGURED",
  invalid_provider: "UNSUPPORTED_AI_PROVIDER",
  invalid_model: "INVALID_AGENT_CONFIG",
  invalid_config: "INVALID_AGENT_CONFIG",
  auth_error: "AI_AUTHENTICATION_ERROR",
  rate_limited: "AI_RATE_LIMIT",
  temporary_error: "AI_PROVIDER_ERROR",
  unknown_error: "AI_PROVIDER_ERROR",
};

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AgentRuntimeError("AI_TIMEOUT")), TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Executa um agente: config → prompt → provider → resposta. */
export async function runAgent(rawInput: unknown): Promise<RunAgentResult> {
  const parsed = runAgentInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new AgentRuntimeError("INVALID_INPUT");
  const input: RunAgentInput = parsed.data;

  const startedAt = Date.now();
  const config = loadAgentConfig(input);
  const providerId = config.ai.provider;

  if (!AI_PROVIDERS.some((p) => p.id === providerId)) {
    throw new AgentRuntimeError("UNSUPPORTED_AI_PROVIDER");
  }
  if (!isAIProviderConfigured(providerId)) {
    throw new AgentRuntimeError("AI_PROVIDER_NOT_CONFIGURED");
  }

  try {
    const provider = createAIProvider(providerId);
    const response = await withTimeout(
      provider.generateResponse({
        system: buildSystemPrompt(config),
        messages: buildConversation(input.history, input.message),
        model: config.ai.model,
        ...(config.ai.temperature !== undefined ? { temperature: config.ai.temperature } : {}),
        maxOutputTokens: 1024,
      }),
    );

    const text = response.text.trim();
    if (!text) throw new AgentRuntimeError("INVALID_AI_RESPONSE");

    logRun({
      agentId: input.agentId,
      provider: providerId,
      model: response.model,
      latencyMs: Date.now() - startedAt,
      status: "ok",
    });

    return {
      message: text,
      provider: response.provider,
      model: response.model,
      usage: response.usage,
    };
  } catch (error) {
    const runtimeError =
      error instanceof AgentRuntimeError
        ? error
        : error instanceof AIProviderError
          ? new AgentRuntimeError(AI_ERROR_MAP[error.code])
          : new AgentRuntimeError("AGENT_RUNTIME_ERROR");

    logRun({
      agentId: input.agentId,
      provider: providerId,
      model: config.ai.model,
      latencyMs: Date.now() - startedAt,
      status: "error",
      error: runtimeError.code,
    });
    throw runtimeError;
  }
}

/** Observabilidade mínima: nunca registra chaves nem conteúdo das mensagens. */
function logRun(entry: {
  agentId: string;
  provider: string;
  model: string;
  latencyMs: number;
  status: "ok" | "error";
  error?: string;
}) {
  console.info("[agent-runtime]", JSON.stringify(entry));
}

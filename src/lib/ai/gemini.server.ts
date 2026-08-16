/**
 * GeminiProvider — única camada que conhece a API do Google Gemini.
 * Server-only: a chave vem de GEMINI_API_KEY.
 */
import {
  AIProviderError,
  AI_MODELS,
  DEFAULT_AI_MODEL,
  type AIProvider,
  type AIRequest,
  type AIResponse,
} from "@/domain/ai";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPayload = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export function createGeminiProvider(apiKey: string | undefined): AIProvider {
  return {
    id: "gemini",
    defaultModel: DEFAULT_AI_MODEL.gemini,

    async generateResponse(request: AIRequest): Promise<AIResponse> {
      if (!apiKey) throw new AIProviderError("missing_api_key", "gemini");

      const model = request.model ?? DEFAULT_AI_MODEL.gemini;
      if (!AI_MODELS.gemini.includes(model)) {
        throw new AIProviderError("invalid_model", "gemini");
      }
      if (request.messages.length === 0) {
        throw new AIProviderError("invalid_config", "gemini");
      }

      let response: Response;
      try {
        response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            ...(request.system
              ? { systemInstruction: { parts: [{ text: request.system }] } }
              : {}),
            contents: request.messages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            generationConfig: {
              ...(request.temperature !== undefined
                ? { temperature: request.temperature }
                : {}),
              ...(request.maxOutputTokens
                ? { maxOutputTokens: request.maxOutputTokens }
                : {}),
            },
          }),
        });
      } catch {
        throw new AIProviderError("temporary_error", "gemini");
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new AIProviderError("auth_error", "gemini");
        }
        if (response.status === 429) throw new AIProviderError("rate_limited", "gemini");
        if (response.status >= 500) throw new AIProviderError("temporary_error", "gemini");
        throw new AIProviderError("unknown_error", "gemini");
      }

      const payload = (await response.json()) as GeminiPayload;
      const text =
        payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

      return {
        text,
        provider: "gemini",
        model,
        usage: {
          inputTokens: payload.usageMetadata?.promptTokenCount,
          outputTokens: payload.usageMetadata?.candidatesTokenCount,
        },
      };
    },
  };
}

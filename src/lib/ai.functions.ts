/**
 * Status do provedor de IA para a UI. Não expõe a chave, apenas se está configurada.
 */
import { createServerFn } from "@tanstack/react-start";
import { AI_PROVIDERS, type AIProviderId } from "@/domain/ai";

export const getAIProviderStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ provider: AIProviderId; configured: boolean }[]> => {
    const { isAIProviderConfigured } = await import("./ai/index.server");
    return AI_PROVIDERS.map((p) => ({
      provider: p.id,
      configured: isAIProviderConfigured(p.id),
    }));
  },
);

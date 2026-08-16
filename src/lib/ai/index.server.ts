/**
 * Fábrica de provedores de IA. O restante da aplicação depende de AIProvider.
 */
import { AIProviderError, type AIProvider, type AIProviderId } from "@/domain/ai";
import { createGeminiProvider } from "./gemini.server";

export function isAIProviderConfigured(provider: AIProviderId): boolean {
  if (provider === "gemini") return Boolean(process.env["GEMINI_API_KEY"]);
  return false;
}

export function createAIProvider(provider: AIProviderId): AIProvider {
  if (provider === "gemini") {
    return createGeminiProvider(process.env["GEMINI_API_KEY"]);
  }
  throw new AIProviderError("invalid_provider", provider);
}

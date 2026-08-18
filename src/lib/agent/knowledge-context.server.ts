/**
 * Ponte entre o AgentRuntime e a Knowledge Base.
 * O runtime não conhece a implementação do retrieval — apenas pede contexto.
 */
import type { AgentConfig } from "@/domain/agent";
import { normalizeText, type KnowledgeDocument } from "@/domain/knowledge";
import {
  createKnowledgeRetriever,
  MAX_CONTEXT_CHARS,
} from "@/lib/knowledge/retriever.server";

/** O texto manual também é um item da Knowledge Base. */
function documentsOf(agentId: string, config: AgentConfig): KnowledgeDocument[] {
  const owned = config.knowledge.documents.filter((d) => d.agentId === agentId);
  const manual = normalizeText(config.knowledge.content);
  if (!manual) return owned;
  return [
    ...owned,
    {
      id: `${agentId}:manual`,
      agentId,
      name: "Informações adicionais",
      type: "manual" as const,
      mimeType: "text/plain",
      size: manual.length,
      status: "ready" as const,
      content: manual,
      createdAt: "",
      updatedAt: String(manual.length),
    },
  ];
}

export async function retrieveKnowledgeContext(
  agentId: string,
  config: AgentConfig,
  query: string,
): Promise<string[]> {
  const retriever = createKnowledgeRetriever(agentId, documentsOf(agentId, config));
  const results = await retriever.retrieve(agentId, query);

  const context: string[] = [];
  let budget = MAX_CONTEXT_CHARS;
  for (const { chunk } of results) {
    const text = `(${chunk.documentName}) ${chunk.content}`;
    if (text.length > budget) break;
    budget -= text.length;
    context.push(text);
  }
  return context;
}

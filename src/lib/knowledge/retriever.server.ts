/**
 * KnowledgeRetriever — busca textual simples (TF-IDF por chunk), isolada por agentId.
 * A interface está pronta para uma implementação com embeddings no futuro,
 * sem exigir mudanças no AgentRuntime nem no PromptBuilder.
 */
import { KnowledgeError, type KnowledgeChunk, type KnowledgeDocument } from "@/domain/knowledge";
import { chunkDocument } from "./chunking";

export const MAX_RETRIEVED_CHUNKS = 4;
export const MAX_CONTEXT_CHARS = 2400;
const MIN_SCORE = 0.12;

export type RetrievedChunk = { chunk: KnowledgeChunk; score: number };

export interface KnowledgeRetriever {
  retrieve(agentId: string, query: string): Promise<RetrievedChunk[]>;
}

const STOPWORDS = new Set([
  "a","o","as","os","de","da","do","das","dos","e","em","um","uma","para","por","com","que","qual",
  "quais","é","sao","são","no","na","nos","nas","se","ao","à","como","voces","vocês","meu","minha",
  "the","of","to","and","is","what","are",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

type Index = { chunks: KnowledgeChunk[]; tokens: Map<string, number>[]; df: Map<string, number> };

/** Cache do índice por agente, evitando reprocessar documentos já indexados. */
const indexCache = new Map<string, { signature: string; index: Index }>();

function signatureOf(docs: KnowledgeDocument[]): string {
  return docs.map((d) => `${d.id}:${d.updatedAt}:${d.status}:${d.content.length}`).join("|");
}

function buildIndex(chunks: KnowledgeChunk[]): Index {
  const tokens = chunks.map((c) => {
    const counts = new Map<string, number>();
    for (const t of tokenize(c.content)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return counts;
  });
  const df = new Map<string, number>();
  for (const counts of tokens) {
    for (const term of counts.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }
  return { chunks, tokens, df };
}

/**
 * Cria um retriever a partir dos documentos do agente.
 * Todo documento de outro agente é descartado antes da indexação.
 */
export function createKnowledgeRetriever(
  agentId: string,
  documents: KnowledgeDocument[],
): KnowledgeRetriever {
  const owned = documents.filter((d) => d.agentId === agentId && d.status === "ready" && d.content.trim());
  const signature = signatureOf(owned);
  const cached = indexCache.get(agentId);
  let index: Index;
  if (cached && cached.signature === signature) {
    index = cached.index;
  } else {
    index = buildIndex(owned.flatMap(chunkDocument));
    indexCache.set(agentId, { signature, index });
  }

  return {
    async retrieve(requestedAgentId, query) {
      if (requestedAgentId !== agentId) throw new KnowledgeError("KNOWLEDGE_ACCESS_ERROR");
      if (!index.chunks.length) return [];

      const queryTerms = tokenize(query);
      if (!queryTerms.length) return [];

      const total = index.chunks.length;
      const scored: RetrievedChunk[] = index.chunks.map((chunk, i) => {
        const counts = index.tokens[i]!;
        const length = Math.max(1, [...counts.values()].reduce((a, b) => a + b, 0));
        let score = 0;
        for (const term of new Set(queryTerms)) {
          const tf = counts.get(term);
          if (!tf) continue;
          const idf = Math.log(1 + total / (index.df.get(term) ?? 1));
          score += (tf / length) * idf;
        }
        return { chunk, score: score / Math.sqrt(new Set(queryTerms).size) };
      });

      const best = scored.reduce((m, s) => Math.max(m, s.score), 0);
      if (best <= 0) return [];

      // Descarta conteúdo irrelevante: só chunks próximos do melhor resultado.
      return scored
        .filter((s) => s.score >= Math.max(MIN_SCORE * best, best * 0.35))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RETRIEVED_CHUNKS);
    },
  };
}

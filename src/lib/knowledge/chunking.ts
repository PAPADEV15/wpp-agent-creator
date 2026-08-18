/**
 * Chunking determinístico e simples: parágrafos agrupados por tamanho.
 * Puro: sem IO, sem provedor.
 */
import type { KnowledgeChunk, KnowledgeDocument } from "@/domain/knowledge";
import { normalizeText } from "@/domain/knowledge";

export const CHUNK_MAX_CHARS = 900;
export const CHUNK_MIN_CHARS = 120;

export function chunkText(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/).flatMap((block) =>
    block.length <= CHUNK_MAX_CHARS ? [block] : splitLongBlock(block),
  );

  const chunks: string[] = [];
  let current = "";
  for (const block of blocks) {
    if (!current) current = block;
    else if (current.length + block.length + 2 <= CHUNK_MAX_CHARS) current += `\n\n${block}`;
    else {
      chunks.push(current);
      current = block;
    }
  }
  if (current) {
    const last = chunks[chunks.length - 1];
    if (current.length < CHUNK_MIN_CHARS && last && last.length + current.length + 2 <= CHUNK_MAX_CHARS) {
      chunks[chunks.length - 1] = `${last}\n\n${current}`;
    } else {
      chunks.push(current);
    }
  }
  return chunks;
}

function splitLongBlock(block: string): string[] {
  const sentences = block.split(/(?<=[.!?;\n])\s+/);
  const out: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const piece = sentence.length > CHUNK_MAX_CHARS ? sentence.slice(0, CHUNK_MAX_CHARS) : sentence;
    if (current.length + piece.length + 1 <= CHUNK_MAX_CHARS) {
      current = current ? `${current} ${piece}` : piece;
    } else {
      if (current) out.push(current);
      current = piece;
    }
  }
  if (current) out.push(current);
  return out;
}

export function chunkDocument(doc: KnowledgeDocument): KnowledgeChunk[] {
  if (doc.status !== "ready") return [];
  return chunkText(doc.content).map((content, position) => ({
    id: `${doc.id}:${position}`,
    documentId: doc.id,
    agentId: doc.agentId,
    documentName: doc.name,
    content,
    position,
  }));
}

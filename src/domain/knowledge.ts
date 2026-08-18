/**
 * Domínio da Knowledge Base — independente de UI, storage e provedor de IA.
 * Documentos e chunks pertencem sempre a um agente (isolamento por agentId).
 */
import { z } from "zod";

export const KNOWLEDGE_DOC_TYPES = ["manual", "txt", "md", "csv", "json"] as const;
export type KnowledgeDocType = (typeof KNOWLEDGE_DOC_TYPES)[number];

/** Formatos aceitos no seletor mas ainda não processáveis nesta fase. */
export const UNSUPPORTED_EXTENSIONS = ["pdf", "docx", "doc"] as const;

export const KNOWLEDGE_DOC_STATUSES = ["processing", "ready", "error"] as const;
export type KnowledgeDocStatus = (typeof KNOWLEDGE_DOC_STATUSES)[number];

export const MAX_DOCUMENT_BYTES = 1_000_000;
export const MAX_DOCUMENTS_PER_AGENT = 25;

export const knowledgeDocumentSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().min(1),
  name: z.string().trim().min(1),
  type: z.enum(KNOWLEDGE_DOC_TYPES),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  status: z.enum(KNOWLEDGE_DOC_STATUSES),
  /** Texto já extraído e normalizado. Vazio quando status !== "ready". */
  content: z.string(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type KnowledgeDocument = z.infer<typeof knowledgeDocumentSchema>;

export type KnowledgeChunk = {
  id: string;
  documentId: string;
  agentId: string;
  documentName: string;
  content: string;
  position: number;
};

export const KNOWLEDGE_ERROR_CODES = [
  "KNOWLEDGE_NOT_FOUND",
  "DOCUMENT_PROCESSING_ERROR",
  "UNSUPPORTED_FILE_TYPE",
  "EMPTY_DOCUMENT",
  "DOCUMENT_TOO_LARGE",
  "RETRIEVAL_ERROR",
  "KNOWLEDGE_ACCESS_ERROR",
] as const;
export type KnowledgeErrorCode = (typeof KNOWLEDGE_ERROR_CODES)[number];

export const KNOWLEDGE_ERROR_MESSAGES: Record<KnowledgeErrorCode, string> = {
  KNOWLEDGE_NOT_FOUND: "Conteúdo não encontrado.",
  DOCUMENT_PROCESSING_ERROR: "Não foi possível ler este arquivo.",
  UNSUPPORTED_FILE_TYPE:
    "Formato ainda não suportado. Use TXT, MD, CSV ou JSON (ou cole o texto manualmente).",
  EMPTY_DOCUMENT: "O arquivo não contém texto legível.",
  DOCUMENT_TOO_LARGE: "Arquivo muito grande (limite de 1 MB).",
  RETRIEVAL_ERROR: "Não foi possível consultar a base de conhecimento.",
  KNOWLEDGE_ACCESS_ERROR: "Sem acesso a este conteúdo.",
};

export class KnowledgeError extends Error {
  constructor(readonly code: KnowledgeErrorCode) {
    super(KNOWLEDGE_ERROR_MESSAGES[code]);
    this.name = "KnowledgeError";
  }
}

/** Normalização de texto: espaços, quebras excessivas e caracteres de controle. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

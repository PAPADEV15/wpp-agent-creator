/**
 * Extração de texto no cliente para formatos processáveis de forma confiável.
 * Formatos não suportados nesta fase retornam erro claro — nunca "fingem" processar.
 */
import {
  KnowledgeError,
  MAX_DOCUMENT_BYTES,
  UNSUPPORTED_EXTENSIONS,
  normalizeText,
  type KnowledgeDocType,
} from "@/domain/knowledge";

const EXT_TO_TYPE: Record<string, KnowledgeDocType> = {
  txt: "txt",
  text: "txt",
  md: "md",
  markdown: "md",
  csv: "csv",
  json: "json",
};

export const ACCEPTED_INPUT = ".txt,.md,.markdown,.csv,.json";

export function detectType(fileName: string): KnowledgeDocType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if ((UNSUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new KnowledgeError("UNSUPPORTED_FILE_TYPE");
  }
  const type = EXT_TO_TYPE[ext];
  if (!type) throw new KnowledgeError("UNSUPPORTED_FILE_TYPE");
  return type;
}

/** Extração + normalização. Lança KnowledgeError com código específico. */
export async function extractFileText(file: File): Promise<{ type: KnowledgeDocType; content: string }> {
  const type = detectType(file.name);
  if (file.size > MAX_DOCUMENT_BYTES) throw new KnowledgeError("DOCUMENT_TOO_LARGE");

  let raw: string;
  try {
    raw = await file.text();
  } catch {
    throw new KnowledgeError("DOCUMENT_PROCESSING_ERROR");
  }

  let content = raw;
  if (type === "json") {
    try {
      content = jsonToText(JSON.parse(raw));
    } catch {
      throw new KnowledgeError("DOCUMENT_PROCESSING_ERROR");
    }
  }
  if (type === "csv") content = csvToText(raw);

  const normalized = normalizeText(content);
  if (!normalized) throw new KnowledgeError("EMPTY_DOCUMENT");
  return { type, content: normalized };
}

function jsonToText(value: unknown, prefix = ""): string {
  if (value === null || typeof value !== "object") return `${prefix}: ${String(value)}`;
  if (Array.isArray(value)) return value.map((v, i) => jsonToText(v, `${prefix}[${i}]`)).join("\n");
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => jsonToText(v, prefix ? `${prefix}.${k}` : k))
    .join("\n");
}

function csvToText(raw: string): string {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return "";
  const header = lines[0]!.split(/[;,]/).map((h) => h.trim());
  return lines
    .slice(1)
    .map((line) => {
      const cells = line.split(/[;,]/).map((c) => c.trim());
      return header.map((h, i) => `${h}: ${cells[i] ?? ""}`).join(" | ");
    })
    .join("\n");
}

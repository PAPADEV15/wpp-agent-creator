import { useRef, useState } from "react";
import { FileText, RefreshCw, Trash2, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  KnowledgeError,
  MAX_DOCUMENTS_PER_AGENT,
  type KnowledgeDocument,
} from "@/domain/knowledge";
import { ACCEPTED_INPUT, extractFileText } from "@/lib/knowledge/extract";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function KnowledgeManager({
  agentId,
  documents,
  onChange,
}: {
  agentId: string;
  documents: KnowledgeDocument[];
  onChange: (docs: KnowledgeDocument[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(new Map<string, File>());
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const docsRef = useRef(documents);
  docsRef.current = documents;

  function upsert(doc: KnowledgeDocument) {
    const next = docsRef.current.some((d) => d.id === doc.id)
      ? docsRef.current.map((d) => (d.id === doc.id ? doc : d))
      : [...docsRef.current, doc];
    docsRef.current = next;
    onChange(next);
  }

  async function processFile(file: File, id: string) {
    const now = new Date().toISOString();
    const base: KnowledgeDocument = {
      id,
      agentId,
      name: file.name,
      type: "txt",
      mimeType: file.type || "text/plain",
      size: file.size,
      status: "processing",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    upsert(base);
    try {
      const { type, content } = await extractFileText(file);
      upsert({ ...base, type, status: "ready", content, updatedAt: new Date().toISOString() });
    } catch (error) {
      upsert({
        ...base,
        status: "error",
        error: error instanceof KnowledgeError ? error.message : "Não foi possível ler este arquivo.",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const room = MAX_DOCUMENTS_PER_AGENT - docsRef.current.length;
    const files = Array.from(list).slice(0, Math.max(0, room));
    setBusy(true);
    for (const file of files) {
      const id = newId();
      filesRef.current.set(id, file);
      await processFile(file, id);
    }
    setBusy(false);
  }

  function remove(id: string) {
    filesRef.current.delete(id);
    const next = docsRef.current.filter((d) => d.id !== id);
    docsRef.current = next;
    onChange(next);
  }

  async function reprocess(id: string) {
    const file = filesRef.current.get(id);
    if (!file) return;
    setBusy(true);
    await processFile(file, id);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        )}
      >
        <Upload className="size-5 text-primary" />
        <p className="text-sm font-medium">Arraste arquivos aqui ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground">TXT • MD • CSV • JSON (até 1 MB cada)</p>
        <p className="text-xs text-muted-foreground">
          PDF e DOCX ainda não são processados nesta versão — cole o texto no campo abaixo.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_INPUT}
          className="hidden"
          aria-label="Selecionar arquivos de conhecimento"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-2">
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {busy ? "Processando arquivos..." : "Nenhum documento adicionado ainda."}
          </p>
        ) : (
          documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2.5"
            >
              {d.status === "ready" ? (
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
              ) : d.status === "processing" ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.type.toUpperCase()} • {formatSize(d.size)} •{" "}
                  {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                  {d.status === "error" && d.error ? ` • ${d.error}` : ""}
                </p>
              </div>
              {filesRef.current.has(d.id) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Reprocessar ${d.name}`}
                  onClick={() => void reprocess(d.id)}
                >
                  <RefreshCw className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Excluir ${d.name}`}
                onClick={() => remove(d.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="size-3.5" /> O agente busca apenas os trechos relevantes para cada
        pergunta.
      </p>
    </div>
  );
}

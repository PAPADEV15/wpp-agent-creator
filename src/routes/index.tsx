import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AgentWizard } from "@/components/agent-wizard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgentKit — Configure seu agente de WhatsApp com IA" },
      {
        name: "description",
        content:
          "Monte o agente de WhatsApp do seu negócio em minutos: personalidade, conhecimento e conexão com Twilio ou Meta, com arquivos prontos para download.",
      },
      { property: "og:title", content: "AgentKit — Configure seu agente de WhatsApp" },
      {
        property: "og:description",
        content:
          "Assistente guiado para configurar seu agente de WhatsApp com IA e gerar os arquivos do projeto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-12 sm:px-8">
      <header className="mb-10 max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" /> AgentKit
        </span>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          Configure seu agente de WhatsApp
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Responda quatro etapas simples e receba os arquivos de configuração
          prontos para rodar o seu agente com IA.
        </p>
      </header>
      <AgentWizard />
    </main>
  );
}

/**
 * Domínio do agente — independente de UI, runtime e provedores.
 * Somente o modelo de configuração desta fase: Agent, AgentConfig,
 * Knowledge, WhatsAppChannel e configuração de IA (sem segredos).
 */
import { z } from "zod";

import { aiConfigSchema, defaultAIConfig } from "./ai";

export const WHATSAPP_PROVIDERS = ["twilio", "meta"] as const;
export type WhatsAppProvider = (typeof WHATSAPP_PROVIDERS)[number];

export const AGENT_TONES = [
  { id: "profissional", label: "Profissional", hint: "Formal e objetivo" },
  { id: "amigavel", label: "Amigável", hint: "Próximo e casual" },
  { id: "vendedor", label: "Vendedor", hint: "Persuasivo e ativo" },
  { id: "empatico", label: "Empático", hint: "Acolhedor e calmo" },
] as const;
export type AgentTone = (typeof AGENT_TONES)[number]["id"];

export const AGENT_GOALS = [
  "Responder perguntas frequentes",
  "Agendar horários ou reservas",
  "Qualificar leads e vender",
  "Receber pedidos",
  "Suporte pós-venda",
] as const;

export const businessProfileSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do negócio"),
  description: z.string().trim().min(1, "Descreva o que o negócio faz"),
  hours: z.string().trim(),
  language: z.string().trim(),
});

export const agentPersonaSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do agente"),
  tone: z.enum(AGENT_TONES.map((t) => t.id) as [AgentTone, ...AgentTone[]]),
  goals: z.array(z.string().trim()).min(1, "Escolha ao menos um objetivo"),
});

export const knowledgeSchema = z.object({
  content: z.string(),
  fallback: z.string().trim().min(1),
});

export const whatsappChannelSchema = z.object({
  provider: z.enum(WHATSAPP_PROVIDERS),
  meta: z.object({
    accessToken: z.string(),
    phoneNumberId: z.string(),
    verifyToken: z.string(),
  }),
  twilio: z.object({
    accountSid: z.string(),
    authToken: z.string(),
    phoneNumber: z.string(),
  }),
});

export const agentConfigSchema = z.object({
  business: businessProfileSchema,
  persona: agentPersonaSchema,
  knowledge: knowledgeSchema,
  whatsapp: whatsappChannelSchema,
  ai: aiConfigSchema,
});

export const AGENT_STATUSES = ["draft", "published"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const agentSchema = z.object({
  id: z.string(),
  status: z.enum(AGENT_STATUSES),
  config: agentConfigSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type AgentPersona = z.infer<typeof agentPersonaSchema>;
export type Knowledge = z.infer<typeof knowledgeSchema>;
export type WhatsAppChannel = z.infer<typeof whatsappChannelSchema>;
export type AgentConfig = z.infer<typeof agentConfigSchema>;
export type Agent = z.infer<typeof agentSchema>;

export const emptyAgentConfig: AgentConfig = {
  business: {
    name: "",
    description: "",
    hours: "Segunda a sexta, 9h às 18h",
    language: "Português (Brasil)",
  },
  persona: { name: "", tone: "amigavel", goals: [] },
  knowledge: {
    content: "",
    fallback:
      "Não tenho essa informação agora, vou te conectar com alguém do time.",
  },
  whatsapp: {
    provider: "twilio",
    meta: { accessToken: "", phoneNumberId: "", verifyToken: "agentkit-verify" },
    twilio: { accountSid: "", authToken: "", phoneNumber: "" },
  },
  ai: defaultAIConfig,
};

/** Cria um agente em rascunho, sem persistência (fase de configuração). */
export function createDraftAgent(id: string, now: string): Agent {
  return {
    id,
    status: "draft",
    config: emptyAgentConfig,
    createdAt: now,
    updatedAt: now,
  };
}

/** Atualiza uma seção da configuração preservando o restante. */
export function updateAgentConfig<K extends keyof AgentConfig>(
  config: AgentConfig,
  section: K,
  patch: Partial<AgentConfig[K]>,
): AgentConfig {
  return { ...config, [section]: { ...config[section], ...patch } };
}

export type AgentConfigStep = "business" | "persona" | "knowledge" | "whatsapp" | "ai";

/** Valida apenas a seção relevante para cada etapa do wizard. */
export function validateStep(
  config: AgentConfig,
  step: AgentConfigStep,
): { ok: true } | { ok: false; message: string } {
  const schemas = {
    business: businessProfileSchema,
    persona: agentPersonaSchema,
    knowledge: knowledgeSchema,
    whatsapp: whatsappChannelSchema,
    ai: aiConfigSchema,
  } as const;

  const result = schemas[step].safeParse(config[step]);
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message ?? "Dados inválidos" };
  }

  if (step === "whatsapp") {
    const w = config.whatsapp;
    const missing =
      w.provider === "meta"
        ? !w.meta.accessToken || !w.meta.phoneNumberId
        : !w.twilio.accountSid || !w.twilio.authToken || !w.twilio.phoneNumber;
    if (missing) {
      return { ok: false, message: "Preencha as credenciais do provedor escolhido" };
    }
  }

  return { ok: true };
}

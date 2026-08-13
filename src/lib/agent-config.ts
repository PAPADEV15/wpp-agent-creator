export type Provider = "meta" | "twilio";

export type AgentConfig = {
  businessName: string;
  businessDescription: string;
  goals: string[];
  agentName: string;
  tone: string;
  hours: string;
  language: string;
  knowledge: string;
  fallback: string;
  anthropicKey: string;
  provider: Provider;
  metaToken: string;
  metaPhoneId: string;
  metaVerifyToken: string;
  twilioSid: string;
  twilioToken: string;
  twilioPhone: string;
};

export const defaultConfig: AgentConfig = {
  businessName: "",
  businessDescription: "",
  goals: [],
  agentName: "",
  tone: "amigavel",
  hours: "Segunda a sexta, 9h às 18h",
  language: "Português (Brasil)",
  knowledge: "",
  fallback:
    "Não tenho essa informação agora, vou te conectar com alguém do time.",
  anthropicKey: "",
  provider: "twilio",
  metaToken: "",
  metaPhoneId: "",
  metaVerifyToken: "agentkit-verify",
  twilioSid: "",
  twilioToken: "",
  twilioPhone: "",
};

export const GOALS = [
  "Responder perguntas frequentes",
  "Agendar horários ou reservas",
  "Qualificar leads e vender",
  "Receber pedidos",
  "Suporte pós-venda",
];

export const TONES = [
  { id: "profissional", label: "Profissional", hint: "Formal e objetivo" },
  { id: "amigavel", label: "Amigável", hint: "Próximo e casual" },
  { id: "vendedor", label: "Vendedor", hint: "Persuasivo e ativo" },
  { id: "empatico", label: "Empático", hint: "Acolhedor e calmo" },
];

const q = (s: string) => JSON.stringify(s || "");

export function buildBusinessYaml(c: AgentConfig) {
  return `# config/business.yaml — gerado pelo AgentKit
negocio:
  nombre: ${q(c.businessName)}
  descripcion: ${q(c.businessDescription)}
  horario: ${q(c.hours)}
  idioma: ${q(c.language)}

agente:
  nombre: ${q(c.agentName)}
  tono: ${q(c.tone)}
  objetivos:
${(c.goals.length ? c.goals : ["Responder perguntas frequentes"]).map((g) => `    - ${q(g)}`).join("\n")}
  fallback: ${q(c.fallback)}
`;
}

export function buildPromptsYaml(c: AgentConfig) {
  const tone = TONES.find((t) => t.id === c.tone)?.label ?? c.tone;
  const prompt = `Você é ${c.agentName || "o assistente"}, atendente virtual de ${c.businessName || "o negócio"} no WhatsApp.

SOBRE O NEGÓCIO
${c.businessDescription || "-"}

HORÁRIO DE ATENDIMENTO
${c.hours}

SEUS OBJETIVOS
${(c.goals.length ? c.goals : ["Responder perguntas frequentes"]).map((g) => `- ${g}`).join("\n")}

COMO FALAR
- Tom: ${tone}
- Idioma: ${c.language}
- Mensagens curtas, próprias para WhatsApp. Sem markdown pesado.
- Uma pergunta por vez.

REGRAS
- Nunca invente informação. Use apenas o conhecimento abaixo.
- Se não souber, responda: "${c.fallback}"

BASE DE CONHECIMENTO
${c.knowledge || "(adicione informações na pasta /knowledge)"}`;

  return `# config/prompts.yaml — gerado pelo AgentKit
system_prompt: |
${prompt
  .split("\n")
  .map((l) => `  ${l}`)
  .join("\n")}
`;
}

export function buildEnv(c: AgentConfig) {
  const lines = [
    `ANTHROPIC_API_KEY=${c.anthropicKey}`,
    `WHATSAPP_PROVIDER=${c.provider}`,
  ];
  if (c.provider === "meta") {
    lines.push(
      `META_ACCESS_TOKEN=${c.metaToken}`,
      `META_PHONE_NUMBER_ID=${c.metaPhoneId}`,
      `META_VERIFY_TOKEN=${c.metaVerifyToken}`,
    );
  } else {
    lines.push(
      `TWILIO_ACCOUNT_SID=${c.twilioSid}`,
      `TWILIO_AUTH_TOKEN=${c.twilioToken}`,
      `TWILIO_PHONE_NUMBER=${c.twilioPhone}`,
    );
  }
  lines.push(
    "PORT=8000",
    "ENVIRONMENT=development",
    "DATABASE_URL=sqlite+aiosqlite:///./agentkit.db",
  );
  return lines.join("\n") + "\n";
}

export function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Serialização da configuração de domínio para os arquivos do projeto.
 * Camada de adaptação: recebe AgentConfig e devolve texto.
 */
import {
  AGENT_GOALS,
  AGENT_TONES,
  type AgentConfig,
} from "@/domain/agent";

export const GOALS = AGENT_GOALS;
export const TONES = AGENT_TONES;

const q = (s: string) => JSON.stringify(s || "");

const goalsOf = (c: AgentConfig) =>
  c.persona.goals.length ? c.persona.goals : ["Responder perguntas frequentes"];

export function buildBusinessYaml(c: AgentConfig) {
  return `# config/business.yaml — gerado pelo AgentKit
negocio:
  nombre: ${q(c.business.name)}
  descripcion: ${q(c.business.description)}
  horario: ${q(c.business.hours)}
  idioma: ${q(c.business.language)}

agente:
  nombre: ${q(c.persona.name)}
  tono: ${q(c.persona.tone)}
  objetivos:
${goalsOf(c)
  .map((g) => `    - ${q(g)}`)
  .join("\n")}
  fallback: ${q(c.knowledge.fallback)}

ia:
  provider: ${q(c.ai.provider)}
  model: ${q(c.ai.model)}
`;
}

export function buildPromptsYaml(c: AgentConfig) {
  const tone = TONES.find((t) => t.id === c.persona.tone)?.label ?? c.persona.tone;
  const prompt = `Você é ${c.persona.name || "o assistente"}, atendente virtual de ${c.business.name || "o negócio"} no WhatsApp.

SOBRE O NEGÓCIO
${c.business.description || "-"}

HORÁRIO DE ATENDIMENTO
${c.business.hours}

SEUS OBJETIVOS
${goalsOf(c)
  .map((g) => `- ${g}`)
  .join("\n")}

COMO FALAR
- Tom: ${tone}
- Idioma: ${c.business.language}
- Mensagens curtas, próprias para WhatsApp. Sem markdown pesado.
- Uma pergunta por vez.

REGRAS
- Nunca invente informação. Use apenas o conhecimento abaixo.
- Se não souber, responda: "${c.knowledge.fallback}"

BASE DE CONHECIMENTO
${knowledgeText(c) || "(adicione informações na pasta /knowledge)"}`;

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
    "# Preencha no servidor. A chave nunca é embutida por esta página.",
    `AI_PROVIDER=${c.ai.provider}`,
    `AI_MODEL=${c.ai.model}`,
    "GEMINI_API_KEY=",
    "",
    `WHATSAPP_PROVIDER=${c.whatsapp.provider}`,
  ];
  if (c.whatsapp.provider === "meta") {
    lines.push(
      `META_ACCESS_TOKEN=${c.whatsapp.meta.accessToken}`,
      `META_PHONE_NUMBER_ID=${c.whatsapp.meta.phoneNumberId}`,
      `META_VERIFY_TOKEN=${c.whatsapp.meta.verifyToken}`,
    );
  } else {
    lines.push(
      `TWILIO_ACCOUNT_SID=${c.whatsapp.twilio.accountSid}`,
      `TWILIO_AUTH_TOKEN=${c.whatsapp.twilio.authToken}`,
      `TWILIO_PHONE_NUMBER=${c.whatsapp.twilio.phoneNumber}`,
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

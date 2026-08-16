/**
 * Carregamento do agente para o runtime.
 * Nesta fase não há persistência: o agente em teste é o rascunho configurado
 * no assistente, enviado junto da requisição e validado no servidor.
 * Quando houver banco, basta trocar a implementação desta função.
 */
import { agentConfigSchema, type AgentConfig } from "@/domain/agent";
import { AgentRuntimeError, type RunAgentInput } from "@/domain/runtime";

export function loadAgentConfig(input: RunAgentInput): AgentConfig {
  if (!input.config) throw new AgentRuntimeError("AGENT_NOT_FOUND");
  const parsed = agentConfigSchema.safeParse(input.config);
  if (!parsed.success) throw new AgentRuntimeError("INVALID_AGENT_CONFIG");
  return parsed.data;
}

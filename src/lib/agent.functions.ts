/**
 * Porta de entrada server-side do runtime do agente.
 * Não contém lógica de agente: apenas valida a entrada e delega ao AgentRuntime.
 */
import { createServerFn } from "@tanstack/react-start";

import {
  RUNTIME_ERROR_MESSAGES,
  runAgentInputSchema,
  type RunAgentInput,
  type RunAgentResult,
  type RuntimeErrorCode,
} from "@/domain/runtime";

export type RunAgentResponse =
  | ({ ok: true } & RunAgentResult)
  | { ok: false; code: RuntimeErrorCode; message: string };

export const runAgentMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown): RunAgentInput => runAgentInputSchema.parse(input))
  .handler(async ({ data }): Promise<RunAgentResponse> => {
    const { runAgent } = await import("./agent/runtime.server");
    const { AgentRuntimeError } = await import("@/domain/runtime");
    try {
      const result = await runAgent(data);
      return { ok: true, ...result };
    } catch (error) {
      const code: RuntimeErrorCode =
        error instanceof AgentRuntimeError ? error.code : "AGENT_RUNTIME_ERROR";
      return { ok: false, code, message: RUNTIME_ERROR_MESSAGES[code] };
    }
  });

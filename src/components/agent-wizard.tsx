import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Bot,
  BookOpen,
  Plug,
  Check,
  Copy,
  Download,
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  buildBusinessYaml,
  buildEnv,
  buildPromptsYaml,
  download,
  GOALS,
  TONES,
} from "@/lib/agent-config";
import { AI_PROVIDERS, DEFAULT_AI_MODEL } from "@/domain/ai";
import { getAIProviderStatus } from "@/lib/ai.functions";
import { AgentTestChat } from "@/components/agent-test-chat";
import {
  createDraftAgent,
  updateAgentConfig,
  validateStep,
  type Agent,
  type AgentConfig,
  type AgentConfigStep,
  type AgentTone,
  type WhatsAppProvider,
} from "@/domain/agent";

const STEPS: { id: number; label: string; icon: typeof Building2; section?: AgentConfigStep }[] = [
  { id: 0, label: "Negócio", icon: Building2, section: "business" },
  { id: 1, label: "Agente", icon: Bot, section: "persona" },
  { id: 2, label: "Conhecimento", icon: BookOpen, section: "knowledge" },
  { id: 3, label: "Conexão", icon: Plug, section: "whatsapp" },
  { id: 4, label: "Gerar", icon: Check },
];

function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FileBlock({ name, content }: { name: string; content: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-secondary/40">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">{name}</span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(content);
              toast.success(`${name} copiado`);
            }}
          >
            <Copy className="size-3.5" /> Copiar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => download(name, content)}>
            <Download className="size-3.5" /> Baixar
          </Button>
        </div>
      </div>
      <pre className="max-h-64 overflow-auto p-4 text-xs leading-relaxed text-foreground/85">
        {content}
      </pre>
    </div>
  );
}

export function AgentWizard() {
  const [step, setStep] = useState(0);
  const [agent, setAgent] = useState<Agent>(() =>
    createDraftAgent(crypto.randomUUID(), new Date().toISOString()),
  );
  const c: AgentConfig = agent.config;

  const set = <K extends keyof AgentConfig>(
    section: K,
    patch: Partial<AgentConfig[K]>,
  ) =>
    setAgent((prev) => ({
      ...prev,
      config: updateAgentConfig(prev.config, section, patch),
      updatedAt: new Date().toISOString(),
    }));

  const files = useMemo(
    () => ({
      "business.yaml": buildBusinessYaml(c),
      "prompts.yaml": buildPromptsYaml(c),
      ".env": buildEnv(c),
    }),
    [c],
  );

  const [aiStatus, setAiStatus] = useState<"loading" | "configured" | "missing">("loading");
  useEffect(() => {
    let active = true;
    getAIProviderStatus()
      .then((list) => {
        if (!active) return;
        const entry = list.find((s) => s.provider === c.ai.provider);
        setAiStatus(entry?.configured ? "configured" : "missing");
      })
      .catch(() => active && setAiStatus("missing"));
    return () => {
      active = false;
    };
  }, [c.ai.provider]);

  const section = STEPS[step]?.section;
  const baseValidation = section ? validateStep(c, section) : ({ ok: true } as const);
  const validation =
    baseValidation.ok && section === "whatsapp" ? validateStep(c, "ai") : baseValidation;

  const goNext = () => {
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {/* Stepper */}
        <ol className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => i <= step && setStep(i)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <span className="hidden h-px w-6 bg-border sm:block" />
                )}
              </li>
            );
          })}
        </ol>

        <div
          className="rounded-2xl border border-border bg-card p-6 sm:p-8"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Sobre o seu negócio</h2>
              <Field label="Nome do negócio" htmlFor="bn">
                <Input
                  id="bn"
                  value={c.business.name}
                  onChange={(e) => set("business", { name: e.target.value })}
                  placeholder="Ex: Cafeteria Bom Sabor"
                />
              </Field>
              <Field
                label="O que vocês fazem?"
                hint="Produtos, serviços e quem são seus clientes."
                htmlFor="bd"
              >
                <Textarea
                  id="bd"
                  rows={4}
                  value={c.business.description}
                  onChange={(e) => set("business", { description: e.target.value })}
                  placeholder="Vendemos cafés especiais e doces artesanais para..."
                />
              </Field>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Horário de atendimento" htmlFor="hr">
                  <Input
                    id="hr"
                    value={c.business.hours}
                    onChange={(e) => set("business", { hours: e.target.value })}
                  />
                </Field>
                <Field label="Idioma das respostas" htmlFor="lg">
                  <Input
                    id="lg"
                    value={c.business.language}
                    onChange={(e) => set("business", { language: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Personalidade do agente</h2>
              <Field
                label="Nome do agente"
                hint="É o nome que seus clientes vão ver."
                htmlFor="an"
              >
                <Input
                  id="an"
                  value={c.persona.name}
                  onChange={(e) => set("persona", { name: e.target.value })}
                  placeholder="Ex: Sofia"
                />
              </Field>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Tom de voz</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => set("persona", { tone: t.id as AgentTone })}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        c.persona.tone === t.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/30 hover:border-primary/40",
                      )}
                    >
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Para que serve o agente?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => {
                    const on = c.persona.goals.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          set("persona", {
                            goals: on
                              ? c.persona.goals.filter((x) => x !== g)
                              : [...c.persona.goals, g],
                          })
                        }
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">O que o agente sabe</h2>
              <KnowledgeManager
                agentId={agent.id}
                documents={c.knowledge.documents}
                onChange={(documents) => set("knowledge", { documents })}
              />
              <Field
                label="Informações adicionais"
                hint="Cardápio, preços, endereço, políticas, perguntas frequentes escritas manualmente."
                htmlFor="kb"
              >
                <Textarea
                  id="kb"
                  rows={10}
                  value={c.knowledge.content}
                  onChange={(e) => set("knowledge", { content: e.target.value })}
                  placeholder={"Café americano — R$ 12\nEntrega em até 40 min\nEndereço: ..."}
                />
              </Field>
              <Field label="Resposta quando não souber" htmlFor="fb">
                <Input
                  id="fb"
                  value={c.knowledge.fallback}
                  onChange={(e) => set("knowledge", { fallback: e.target.value })}
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Conexão com o WhatsApp</h2>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Provedor de IA</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {AI_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        set("ai", { provider: p.id, model: DEFAULT_AI_MODEL[p.id] })
                      }
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        c.ai.provider === p.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/30 hover:border-primary/40",
                      )}
                    >
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.hint}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {aiStatus === "configured"
                    ? "Chave do provedor configurada com segurança no servidor."
                    : aiStatus === "missing"
                      ? "A chave do provedor ainda não está configurada no servidor (GEMINI_API_KEY). Você pode seguir com a configuração do agente."
                      : "Verificando a configuração do provedor…"}
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Provedor do WhatsApp</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { id: "twilio", t: "Twilio", d: "Sandbox grátis, ideal para testar" },
                    { id: "meta", t: "Meta Cloud API", d: "Oficial, para produção" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        set("whatsapp", { provider: p.id as WhatsAppProvider })
                      }
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        c.whatsapp.provider === p.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/30 hover:border-primary/40",
                      )}
                    >
                      <p className="text-sm font-medium">{p.t}</p>
                      <p className="text-xs text-muted-foreground">{p.d}</p>
                    </button>
                  ))}
                </div>
              </div>

              {c.whatsapp.provider === "twilio" ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Account SID" htmlFor="ts">
                    <Input
                      id="ts"
                      value={c.whatsapp.twilio.accountSid}
                      onChange={(e) =>
                        set("whatsapp", {
                          twilio: { ...c.whatsapp.twilio, accountSid: e.target.value },
                        })
                      }
                      placeholder="AC..."
                    />
                  </Field>
                  <Field label="Auth Token" htmlFor="tt">
                    <Input
                      id="tt"
                      type="password"
                      value={c.whatsapp.twilio.authToken}
                      onChange={(e) =>
                        set("whatsapp", {
                          twilio: { ...c.whatsapp.twilio, authToken: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="Número do WhatsApp" htmlFor="tp">
                    <Input
                      id="tp"
                      value={c.whatsapp.twilio.phoneNumber}
                      onChange={(e) =>
                        set("whatsapp", {
                          twilio: { ...c.whatsapp.twilio, phoneNumber: e.target.value },
                        })
                      }
                      placeholder="+5511999999999"
                    />
                  </Field>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Access Token" htmlFor="mt">
                    <Input
                      id="mt"
                      type="password"
                      value={c.whatsapp.meta.accessToken}
                      onChange={(e) =>
                        set("whatsapp", {
                          meta: { ...c.whatsapp.meta, accessToken: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="Phone Number ID" htmlFor="mp">
                    <Input
                      id="mp"
                      value={c.whatsapp.meta.phoneNumberId}
                      onChange={(e) =>
                        set("whatsapp", {
                          meta: { ...c.whatsapp.meta, phoneNumberId: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="Verify Token" htmlFor="mv">
                    <Input
                      id="mv"
                      value={c.whatsapp.meta.verifyToken}
                      onChange={(e) =>
                        set("whatsapp", {
                          meta: { ...c.whatsapp.meta, verifyToken: e.target.value },
                        })
                      }
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Arquivos do seu agente</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Baixe e coloque na pasta do projeto AgentKit: os dois YAML em{" "}
                  <code className="font-mono">config/</code> e o{" "}
                  <code className="font-mono">.env</code> na raiz. Depois rode{" "}
                  <code className="font-mono">bash start.sh</code>.
                </p>
              </div>
              {Object.entries(files).map(([name, content]) => (
                <FileBlock key={name} name={name} content={content} />
              ))}
              <Button
                variant="secondary"
                onClick={() => {
                  Object.entries(files).forEach(([n, v]) => download(n, v));
                  toast.success("Arquivos gerados");
                }}
              >
                <Download className="size-4" /> Baixar os 3 arquivos
              </Button>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            {step < STEPS.length - 1 && (
              <div className="flex items-center gap-3">
                {!validation.ok && (
                  <p className="text-xs text-muted-foreground">{validation.message}</p>
                )}
                <Button onClick={goNext} disabled={!validation.ok}>
                  Continuar <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat de teste real */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <AgentTestChat agentId={agent.id} config={c} />
      </aside>
    </div>
  );
}

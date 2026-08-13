import { useMemo, useState } from "react";
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
  MessageCircle,
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
  defaultConfig,
  download,
  GOALS,
  TONES,
  type AgentConfig,
} from "@/lib/agent-config";

const STEPS = [
  { id: 0, label: "Negócio", icon: Building2 },
  { id: 1, label: "Agente", icon: Bot },
  { id: 2, label: "Conhecimento", icon: BookOpen },
  { id: 3, label: "Conexão", icon: Plug },
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
  const [c, setC] = useState<AgentConfig>(defaultConfig);
  const set = <K extends keyof AgentConfig>(k: K, v: AgentConfig[K]) =>
    setC((prev) => ({ ...prev, [k]: v }));

  const files = useMemo(
    () => ({
      "business.yaml": buildBusinessYaml(c),
      "prompts.yaml": buildPromptsYaml(c),
      ".env": buildEnv(c),
    }),
    [c],
  );

  const canAdvance = () => {
    if (step === 0) return c.businessName.trim() && c.businessDescription.trim();
    if (step === 1) return c.agentName.trim() && c.goals.length > 0;
    if (step === 3)
      return c.provider === "meta"
        ? c.metaToken && c.metaPhoneId
        : c.twilioSid && c.twilioToken && c.twilioPhone;
    return true;
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
                  value={c.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
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
                  value={c.businessDescription}
                  onChange={(e) => set("businessDescription", e.target.value)}
                  placeholder="Vendemos cafés especiais e doces artesanais para..."
                />
              </Field>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Horário de atendimento" htmlFor="hr">
                  <Input
                    id="hr"
                    value={c.hours}
                    onChange={(e) => set("hours", e.target.value)}
                  />
                </Field>
                <Field label="Idioma das respostas" htmlFor="lg">
                  <Input
                    id="lg"
                    value={c.language}
                    onChange={(e) => set("language", e.target.value)}
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
                  value={c.agentName}
                  onChange={(e) => set("agentName", e.target.value)}
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
                      onClick={() => set("tone", t.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        c.tone === t.id
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
                    const on = c.goals.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          set(
                            "goals",
                            on ? c.goals.filter((x) => x !== g) : [...c.goals, g],
                          )
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
              <Field
                label="Base de conhecimento"
                hint="Cardápio, preços, endereço, políticas, perguntas frequentes. O agente só responde com o que estiver aqui."
                htmlFor="kb"
              >
                <Textarea
                  id="kb"
                  rows={10}
                  value={c.knowledge}
                  onChange={(e) => set("knowledge", e.target.value)}
                  placeholder={"Café americano — R$ 12\nEntrega em até 40 min\nEndereço: ..."}
                />
              </Field>
              <Field
                label="Resposta quando não souber"
                htmlFor="fb"
              >
                <Input
                  id="fb"
                  value={c.fallback}
                  onChange={(e) => set("fallback", e.target.value)}
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Conexão com o WhatsApp</h2>
              <Field
                label="Chave da API Anthropic"
                hint="Fica apenas no seu navegador e no arquivo .env que você baixar."
                htmlFor="ak"
              >
                <Input
                  id="ak"
                  type="password"
                  value={c.anthropicKey}
                  onChange={(e) => set("anthropicKey", e.target.value)}
                  placeholder="sk-ant-..."
                />
              </Field>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Provedor</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { id: "twilio", t: "Twilio", d: "Sandbox grátis, ideal para testar" },
                    { id: "meta", t: "Meta Cloud API", d: "Oficial, para produção" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set("provider", p.id as AgentConfig["provider"])}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        c.provider === p.id
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

              {c.provider === "twilio" ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Account SID" htmlFor="ts">
                    <Input
                      id="ts"
                      value={c.twilioSid}
                      onChange={(e) => set("twilioSid", e.target.value)}
                      placeholder="AC..."
                    />
                  </Field>
                  <Field label="Auth Token" htmlFor="tt">
                    <Input
                      id="tt"
                      type="password"
                      value={c.twilioToken}
                      onChange={(e) => set("twilioToken", e.target.value)}
                    />
                  </Field>
                  <Field label="Número do WhatsApp" htmlFor="tp">
                    <Input
                      id="tp"
                      value={c.twilioPhone}
                      onChange={(e) => set("twilioPhone", e.target.value)}
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
                      value={c.metaToken}
                      onChange={(e) => set("metaToken", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone Number ID" htmlFor="mp">
                    <Input
                      id="mp"
                      value={c.metaPhoneId}
                      onChange={(e) => set("metaPhoneId", e.target.value)}
                    />
                  </Field>
                  <Field label="Verify Token" htmlFor="mv">
                    <Input
                      id="mv"
                      value={c.metaVerifyToken}
                      onChange={(e) => set("metaVerifyToken", e.target.value)}
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
              <Button
                onClick={() => canAdvance() && setStep((s) => s + 1)}
                disabled={!canAdvance()}
              >
                Continuar <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MessageCircle className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{c.agentName || "Seu agente"}</p>
              <p className="text-xs text-muted-foreground">
                {c.businessName || "Seu negócio"}
              </p>
            </div>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2 text-secondary-foreground">
              Olá! Vocês atendem que horas?
            </div>
            <div
              className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm px-3.5 py-2 text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              Oi! Aqui é {c.agentName || "o assistente"} d{"a "}
              {c.businessName || "nossa loja"}. Nosso horário é {c.hours}.
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2 text-secondary-foreground">
              E quanto custa o combo?
            </div>
            <div
              className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm px-3.5 py-2 text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              {c.knowledge.trim()
                ? c.knowledge.trim().split("\n")[0]
                : c.fallback}
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Pré-visualização ilustrativa do tom e das informações configuradas.
          </p>
        </div>
      </aside>
    </div>
  );
}

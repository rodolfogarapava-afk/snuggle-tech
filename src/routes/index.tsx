import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Clock,
  Heart,
  Image as ImageIcon,
  Info,
  Loader2,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Star,
  Check,
  Sparkles,
} from "lucide-react";
import abracoEternoHero from "@/assets/abraco-eterno-hero.png.asset.json";
import print01 from "@/assets/print-01-mae.webp.asset.json";
import print02 from "@/assets/print-02-marido-jesus.webp.asset.json";
import print03 from "@/assets/print-03-filho-acidente.webp.asset.json";
import print05 from "@/assets/print-05-fernando-emocao.webp.asset.json";
import { sendDiscordEvent } from "@/lib/discord-webhook";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const SUPABASE_URL = "https://uqntcjhkvyvytgwdudtz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbnRjamhrdnl2eXRnd2R1ZHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjM4OTUsImV4cCI6MjA3NjYzOTg5NX0.wYfc_b26MGXYN1k5jxhJ_uLmuwrfRj3H37HIQ2HPPDw";
const BUCKET = "photos";
const FOLDER = "jesus_homenagem";

const apiHeaders = (extra: Record<string, string> = {}) => ({
  apikey: SUPABASE_ANON_KEY,
  authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  ...extra,
});

function safeFileName(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "imagem.png"
  );
}

type Step =
  | "landing"
  | "q1"
  | "name"
  | "q2"
  | "q3"
  | "upload"
  | "whatsapp"
  | "processing"
  | "preview"
  | "checkout"
  | "paid";

const PRICE_CENTS = 4700;
const PRICE_LABEL = "R$ 47,00";


const Q1_OPTIONS = [
  "Minha Mãe",
  "Meu Pai",
  "Meu Companheiro(a)",
  "Meu Filho(a)",
  "Meu Irmão(ã)",
  "Outro familiar/amigo",
];
const Q2_OPTIONS = [
  "O sorriso contagiante.",
  "O abraço que me acolhia.",
  "A fé inabalável e forte.",
  "Os conselhos e a sabedoria.",
];
const Q3_OPTIONS = [
  "No meu celular, para ver quando a saudade apertar.",
  "Para compartilhar com a nossa família.",
  "Para fazer uma linda homenagem a essa pessoa.",
];

function Header() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-lg px-4 py-4 flex items-center justify-center gap-1.5">
        <span className="font-serif text-[1.35rem] text-[#7a5f2d] tracking-wide">Abraço Eterno</span>
        <BadgeCheck className="h-4 w-4 text-[#c9a24a] fill-[#c9a24a] [&>path]:stroke-white" />
      </div>
    </header>
  );
}

function LandingPage() {
  const [step, setStep] = useState<Step>("landing");
  const [answers, setAnswers] = useState({
    q1: "",
    name: "",
    q2: "",
    q3: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState(0);
  const [result, setResult] = useState<{ processedUrl: string; imageUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Processing simulation + real API call
  useEffect(() => {
    if (step !== "processing") return;
    setProcessingProgress(0);
    setProcessingStage(0);
    setError(null);

    let cancelled = false;
    const stages = [
      "Recebendo sua fotografia com carinho...",
      "Suavizando as marcas do tempo...",
      "Preparando o abraço de paz...",
      "Finalizando a homenagem...",
    ];

    const interval = setInterval(() => {
      setProcessingProgress((p) => {
        const next = Math.min(p + 2, 95);
        setProcessingStage(Math.min(stages.length - 1, Math.floor((next / 100) * stages.length)));
        return next;
      });
    }, 400);

    (async () => {
      try {
        if (!file) throw new Error("Foto não encontrada.");
        // Upload
        const filePath = `${FOLDER}/${Date.now()}_${safeFileName(file.name)}`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`;
        const upRes = await fetch(uploadUrl, {
          method: "POST",
          headers: apiHeaders({
            "content-type": file.type || "application/octet-stream",
            "x-upsert": "false",
          }),
          body: file,
        });
        if (!upRes.ok) throw new Error(`Upload falhou (${upRes.status})`);
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;

        // Modo demo: pula a IA (útil quando o limite diário da API foi atingido).
        // Ativa com ?demo=1 na URL.
        const isDemo =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("demo") === "1";

        let processedUrl = publicUrl;

        if (!isDemo) {
          const payload = {
            imageUrl: publicUrl,
            answers: {
              "Quem é a estrela que brilha no céu hoje?": answers.q1,
              [`Qual é a lembrança de ${answers.name || "seu ente querido"} que mais aquece o seu coração?`]:
                answers.q2,
              "Onde você deseja guardar esta Recordação de Luz?": answers.q3,
            },
            customerName: answers.name || "—",
            whatsapp,
          };

          const res = await fetch(`${SUPABASE_URL}/functions/v1/process-homenagem`, {
            method: "POST",
            headers: apiHeaders({ "content-type": "application/json" }),
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(async () => ({ raw: await res.text() }));
          if (!res.ok || !data.success) {
            throw new Error(`Falha ao processar (${res.status})`);
          }
          processedUrl = data.data.processedUrl;
        } else {
          // Simula o tempo de processamento
          await new Promise((r) => setTimeout(r, 1500));
        }

        const data = { data: { processedUrl } };
        if (cancelled) return;
        setResult({ processedUrl: data.data.processedUrl, imageUrl: publicUrl });
        setProcessingProgress(100);
        void sendDiscordEvent({
          stage: "result",
          name: answers.name,
          whatsapp,
          q1: answers.q1,
          q2: answers.q2,
          q3: answers.q3,
          imageUrl: publicUrl,
          processedUrl: data.data.processedUrl,
        });
        setTimeout(() => {
          if (!cancelled) setStep("preview");
        }, 600);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        void sendDiscordEvent({
          stage: "error",
          name: answers.name,
          whatsapp,
          q1: answers.q1,
          q2: answers.q2,
          q3: answers.q3,
          error: msg,
        });
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, file, answers, whatsapp]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-6 pb-16">
        {step === "landing" && <Landing onStart={() => setStep("q1")} />}
        {step === "q1" && (
          <QuestionStep
            stepLabel="PASSO 1 DE 3"
            title="Quem é a estrela que brilha no céu hoje?"
            options={Q1_OPTIONS}
            value={answers.q1}
            onSelect={(v) => {
              setAnswers((a) => ({ ...a, q1: v }));
              setStep("name");
            }}
          />
        )}
        {step === "name" && (
          <NameStep
            value={answers.name}
            onSubmit={(v) => {
              setAnswers((a) => ({ ...a, name: v }));
              setStep("q2");
            }}
            onSkip={() => setStep("q2")}
          />
        )}
        {step === "q2" && (
          <QuestionStep
            stepLabel="PASSO 2 DE 3"
            title={`Qual é a lembrança de ${answers.name ? "seu ente querido" : "seu ente querido"} que mais aquece o seu coração?`}
            options={Q2_OPTIONS}
            value={answers.q2}
            onSelect={(v) => {
              setAnswers((a) => ({ ...a, q2: v }));
              setStep("q3");
            }}
          />
        )}
        {step === "q3" && (
          <QuestionStep
            stepLabel="PASSO 3 DE 3"
            title="Onde você deseja guardar esta Recordação de Luz?"
            options={Q3_OPTIONS}
            value={answers.q3}
            onSelect={(v) => {
              setAnswers((a) => ({ ...a, q3: v }));
              setStep("upload");
            }}
          />
        )}
        {step === "upload" && (
          <UploadStep
            onPick={(f) => {
              setFile(f);
              const url = URL.createObjectURL(f);
              setFilePreview(url);
              setStep("whatsapp");
            }}
          />
        )}
        {step === "whatsapp" && (
          <WhatsappStep
            value={whatsapp}
            onChange={setWhatsapp}
            onSubmit={() => {
              void sendDiscordEvent({
                stage: "lead",
                name: answers.name,
                whatsapp,
                q1: answers.q1,
                q2: answers.q2,
                q3: answers.q3,
              });
              setStep("processing");
            }}
          />
        )}
        {step === "processing" && (
          <ProcessingStep
            preview={filePreview}
            progress={processingProgress}
            stage={processingStage}
            error={error}
            onRetry={() => setStep("processing")}
          />
        )}
        {step === "preview" && result && (
          <PreviewStep
            processedUrl={result.processedUrl}
            name={answers.name}
            onCheckout={() => {
              void sendDiscordEvent({
                stage: "checkout_viewed",
                name: answers.name,
                whatsapp,
                amount: PRICE_LABEL,
              });
              setStep("checkout");
            }}
          />
        )}
        {step === "checkout" && result && (
          <CheckoutStep
            name={answers.name}
            whatsapp={whatsapp}
            processedUrl={result.processedUrl}
            onPaid={(info) => {
              void sendDiscordEvent({
                stage: "paid",
                name: answers.name,
                whatsapp,
                amount: PRICE_LABEL,
                method: info.method,
                orderId: info.orderId,
              });
              setStep("paid");
            }}
            onFailed={(msg) => {
              void sendDiscordEvent({
                stage: "payment_failed",
                name: answers.name,
                whatsapp,
                amount: PRICE_LABEL,
                error: msg,
              });
            }}
          />
        )}
        {step === "paid" && (
          <PaidStep whatsapp={whatsapp} name={answers.name} />
        )}
      </main>
    </div>
  );
}


/* ---------- Steps ---------- */

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-6">
      <div className="mx-auto w-fit rounded-full bg-[#fdf6e3] px-4 py-1.5 flex items-center gap-2 text-[13px] text-[#8a6d3b]">
        <Clock className="h-3.5 w-3.5" />
        Restam 2 vagas com desconto hoje
      </div>

      <div className="text-center space-y-4 pt-1">
        <h1 className="font-serif text-[2rem] leading-[1.15] text-foreground">
          Um abraço de paz para acalmar a saudade.
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed max-w-sm mx-auto">
          Transforme a foto de quem deixou saudade em um{" "}
          <span className="text-[#7a5f2d] font-medium">vídeo emocionante</span> de homenagem.
        </p>
      </div>

      <div className="mx-auto w-[72%] max-w-[260px]">
        <img
          src={abracoEternoHero.url}
          alt="Jesus abraçando uma pessoa querida com carinho"
          width={768}
          height={768}
          className="w-full rounded-2xl shadow-[0_10px_40px_-15px_rgba(122,95,45,0.35)]"
        />
      </div>


      <button
        onClick={onStart}
        className="w-full rounded-xl bg-[#a4802b] hover:bg-[#8f6f22] text-white font-medium tracking-wide py-4 shadow-sm active:scale-[0.99] transition flex items-center justify-center gap-2.5 animate-cta-pulse"
      >
        <Heart className="h-4 w-4 fill-white" />
        Fazer simulação gratuita
      </button>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Veja sua prévia gratuita em instantes
        </p>
        <p className="text-sm text-[#7a5f2d] flex items-center justify-center gap-1.5">
          <Star className="h-3.5 w-3.5 fill-[#c9a24a] text-[#c9a24a]" />
          4.9 · 3.247 famílias já se emocionaram
        </p>
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Rápido, seguro e feito com muito respeito.
        </p>
      </div>


      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          Como funciona?
        </p>
        <ul className="space-y-2.5">
          <HowRow icon={<Heart className="h-4 w-4" />} text="1. Responda 3 perguntas curtas." />
          <HowRow icon={<ImageIcon className="h-4 w-4" />} text="2. Envie uma foto especial." />
          <HowRow icon={<PlayCircle className="h-4 w-4" />} text="3. Veja a mágica acontecer." />
        </ul>
      </div>
    </div>
  );
}

function HowRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-background/60 px-3 py-2">
      <span className="grid place-items-center h-8 w-8 rounded-full border border-[#e8d9ae] text-[#8a6d3b]">
        {icon}
      </span>
      <span className="text-sm text-foreground">{text}</span>
    </li>
  );
}

function QuestionStep({
  stepLabel,
  title,
  options,
  value,
  onSelect,
}: {
  stepLabel: string;
  title: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="pt-6 space-y-6">
      <div className="text-center space-y-3">
        <p className="text-[13px] uppercase tracking-[0.25em] text-[#8a6d3b] font-semibold">
          {stepLabel}
        </p>
        <h2 className="font-serif text-[1.7rem] leading-tight font-bold text-foreground px-2">
          {title}
        </h2>
      </div>
      <div className="space-y-3">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={`w-full flex items-center gap-3 rounded-xl border bg-card px-4 py-4 text-left text-[15px] transition hover:border-[#c9a24a] hover:shadow-sm ${
                active ? "border-[#c9a24a] ring-2 ring-[#c9a24a]/30" : "border-border"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full border-2 grid place-items-center ${
                  active ? "border-[#c9a24a]" : "border-muted-foreground/40"
                }`}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-[#c9a24a]" />}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NameStep({
  value,
  onSubmit,
  onSkip,
}: {
  value: string;
  onSubmit: (v: string) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState(value);
  return (
    <div className="pt-16 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-[13px] uppercase tracking-[0.25em] text-[#8a6d3b] font-semibold">
          Para personalizar sua homenagem
        </p>
        <h2 className="font-serif text-[1.9rem] leading-tight font-bold text-foreground">
          Qual é o nome de seu ente querido?
        </h2>
        <p className="text-muted-foreground text-[15px]">
          Saber o nome nos ajuda a criar algo ainda mais especial e único.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(name.trim());
        }}
        className="space-y-4"
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite o nome aqui..."
          className="w-full text-center rounded-xl border border-[#c9a24a] bg-card px-5 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#c9a24a]/30 placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-[#a4802b] hover:bg-[#8f6f22] text-white font-medium py-4 shadow-sm transition"
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center text-[15px] text-muted-foreground hover:text-foreground py-1"
        >
          Prefiro não dizer agora
        </button>
      </form>
    </div>
  );
}

function UploadStep({ onPick }: { onPick: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="pt-8 space-y-5">
      <div className="text-center space-y-3">
        <h2 className="font-serif text-[1.8rem] leading-tight font-bold text-foreground">
          A fotografia que guarda este momento.
        </h2>
        <p className="text-muted-foreground text-[15px]">
          Toque abaixo para escolher na sua galeria a foto mais bonita dessa pessoa especial.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 flex gap-3">
        <Info className="h-5 w-5 text-[#8a6d3b] shrink-0 mt-0.5" />
        <p className="text-sm text-foreground leading-relaxed">
          <strong>Dica importante:</strong> Escolha uma foto onde apareça{" "}
          <strong>seu ente querido</strong>, com o rosto bem de frente e claro, sem muitas pessoas
          ao redor.
        </p>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-[#c9a24a] bg-[#fdf6e3]/40 py-10 flex flex-col items-center gap-4 hover:bg-[#fdf6e3] transition"
      >
        <span className="grid place-items-center h-14 w-14 rounded-full border border-[#c9a24a] text-[#8a6d3b]">
          <ImageIcon className="h-6 w-6" />
        </span>
        <span className="font-bold uppercase tracking-wide text-foreground">
          Escolher foto da galeria
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />

      <p className="text-center text-sm text-muted-foreground">
        Sua foto será tratada com o máximo de respeito e privacidade.
      </p>
    </div>
  );
}

function WhatsappStep({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="pt-6 space-y-5">
      <div className="text-center space-y-3">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#e8d9ae] text-[#8a6d3b]">
          <Heart className="h-6 w-6" />
        </div>
        <h2 className="font-serif text-[1.7rem] leading-tight font-bold text-foreground">
          A foto de seu ente querido foi recebida com muito carinho.
        </h2>
        <p className="text-muted-foreground text-[15px]">
          Nossa equipe já está preparando um momento que vai tocar o seu coração.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit();
        }}
        className="rounded-xl border border-border bg-card p-5 space-y-4"
      >
        <p className="text-[15px] text-foreground leading-relaxed text-center">
          Para qual número de{" "}
          <span className="text-green-600 font-semibold">WhatsApp</span> devemos enviar a sua
          homenagem finalizada de forma segura e privada?
        </p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Zero spam. Enviamos apenas sua homenagem.
        </p>

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="tel"
          placeholder="(11) 99999-9999"
          className="w-full text-center rounded-xl border border-border bg-background px-5 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#c9a24a]/40"
        />

        <button
          type="submit"
          disabled={!value.trim()}
          className="w-full rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-4 shadow-md transition flex items-center justify-center gap-2"
        >
          <MessageCircle className="h-5 w-5 fill-white" />
          Receber Homenagem no WhatsApp
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-4 w-4" />
        Tratamos suas informações com profundo respeito.
      </p>
      <p className="text-center text-xs text-muted-foreground px-4">
        Ao clicar, aguarde alguns segundos na página para ver a mágica acontecer.
      </p>
    </div>
  );
}

function ProcessingStep({
  preview,
  progress,
  stage,
  error,
  onRetry,
}: {
  preview: string | null;
  progress: number;
  stage: number;
  error: string | null;
  onRetry: () => void;
}) {
  const steps = [
    "Recebendo sua fotografia com carinho...",
    "Suavizando as marcas do tempo...",
    "Preparando o abraço de paz...",
    "Finalizando a homenagem...",
  ];
  return (
    <div className="pt-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="grid place-items-center">
          <Heart className="h-8 w-8 text-[#c9a24a] fill-[#c9a24a]/30" />
        </div>
        <div className="mx-auto h-32 w-32 rounded-full ring-4 ring-[#c9a24a] ring-offset-4 ring-offset-card overflow-hidden">
          {preview ? (
            <img src={preview} alt="Sua foto" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>
        <h2 className="text-center font-serif text-[1.4rem] font-bold">
          Recebendo a foto com muito carinho...
        </h2>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c9a24a] to-[#a4802b] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="space-y-2 text-sm">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              {i < stage ? (
                <Check className="h-4 w-4 text-[#8a6d3b]" />
              ) : i === stage ? (
                <Loader2 className="h-4 w-4 text-[#8a6d3b] animate-spin" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-muted-foreground/30" />
              )}
              <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>{s}</span>
            </li>
          ))}
        </ul>
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive space-y-2">
            <p>{error}</p>
            <button
              onClick={onRetry}
              className="text-xs underline font-semibold"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-5">
        💛 +3.247 famílias já se emocionaram com suas homenagens
      </p>
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        Por favor, não feche esta tela. Estamos preparando um momento muito especial para você.
      </div>
    </div>
  );
}

function PreviewStep({
  processedUrl,
  name,
  onCheckout,
}: {
  processedUrl: string;
  name: string;
  onCheckout: () => void;
}) {
  return (
    <div className="pt-4 space-y-5">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-[1.8rem] leading-tight font-bold text-foreground">
          Olha só o começo da homenagem{name ? ` de ${name}` : ""}…
        </h2>
        <p className="text-muted-foreground text-[15px]">
          E isso é só um pedacinho. Imagina em vídeo, com música suave.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-md bg-black/70 text-white text-[11px] uppercase tracking-wider px-3 py-1 font-semibold">
          Prévia · ainda sem os retoques finais
        </div>
        <div className="relative">
          <img
            src={processedUrl}
            alt="Prévia da homenagem"
            className="w-full aspect-[4/5] object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-around py-8">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="text-white/70 font-serif italic text-2xl tracking-wider drop-shadow"
              >
                PRÉVIA · ALENTO
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#e8d9ae] bg-[#fdf6e3] p-4 flex gap-3">
        <Sparkles className="h-5 w-5 text-[#8a6d3b] shrink-0 mt-0.5" />
        <p className="text-sm text-foreground leading-relaxed">
          <strong>A gente ainda tá cuidando dos detalhes com muito carinho.</strong>
          <br />
          Nossa equipe finaliza à mão cada tracinho do rosto{name ? ` de ${name}` : " de quem você ama"},
          coloca uma música que aquece o peito e monta o vídeo inteirinho.
          Em até <strong>24 horas</strong> ele chega no seu WhatsApp. 💛
        </p>
      </div>

      <button
        onClick={onCheckout}
        className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold py-4 shadow-md transition flex items-center justify-center gap-2 animate-cta-pulse"
      >
        <Heart className="h-5 w-5 fill-white" />
        Quero receber minha homenagem · {PRICE_LABEL}
      </button>

    </div>
  );
}

function CheckoutStep({
  name,
  whatsapp,
  processedUrl,
  onPaid,
  onFailed,
}: {
  name: string;
  whatsapp: string;
  processedUrl: string;
  onPaid: (info: { method: string; orderId: string }) => void;
  onFailed: (msg: string) => void;
}) {
  const [tab, setTab] = useState<"pix" | "credit_card">("pix");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pix, setPix] = useState<{ qrCode: string; qrCodeUrl?: string; orderId: string } | null>(
    null,
  );

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installments, setInstallments] = useState(1);

  // Poll Pix status
  useEffect(() => {
    if (!pix?.orderId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const { getPagarmeOrderStatus } = await import("@/lib/pagarme.functions");
        const res = await getPagarmeOrderStatus({ data: { orderId: pix.orderId } });
        if (cancelled) return;
        if (res.paid) {
          clearInterval(interval);
          onPaid({ method: "pix", orderId: pix.orderId });
        }
      } catch {
        // ignore
      }
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pix, onPaid]);

  async function submit() {
    setErr(null);
    if (!email.trim()) {
      setErr("Informe o e-mail para envio do recibo.");
      return;
    }
    setLoading(true);
    try {
      const { createPagarmeOrder } = await import("@/lib/pagarme.functions");
      const customer = {
        name: name || "Cliente Alento",
        email: email.trim(),
        document: document.replace(/\D/g, ""),
        phone: whatsapp,
      };
      const metadata = {
        whatsapp,
        ente: name || "—",
        processedUrl,
      };

      if (tab === "pix") {
        const res = await createPagarmeOrder({
          data: {
            method: "pix",
            amount: PRICE_CENTS,
            customer,
            metadata,
          },
        });
        if (!res.success) throw new Error(res.error);
        if (!res.pix) throw new Error("QR Code não retornado.");
        setPix({
          qrCode: res.pix.qrCode,
          qrCodeUrl: res.pix.qrCodeUrl,
          orderId: res.orderId,
        });
      } else {
        const [mm, yy] = cardExp.split("/").map((s) => s.trim());
        const expMonth = Number(mm);
        const expYear = Number(yy?.length === 2 ? "20" + yy : yy);
        if (!expMonth || !expYear) throw new Error("Validade do cartão inválida (MM/AA).");
        const res = await createPagarmeOrder({
          data: {
            method: "credit_card",
            amount: PRICE_CENTS,
            customer,
            metadata,
            card: {
              number: cardNumber.replace(/\s/g, ""),
              holder_name: cardHolder,
              exp_month: expMonth,
              exp_year: expYear,
              cvv: cardCvv,
              installments,
            },
          },
        });
        if (!res.success) throw new Error(res.error);
        if (res.chargeStatus === "paid" || res.status === "paid") {
          onPaid({ method: "credit_card", orderId: res.orderId });
        } else {
          const msg = res.acquirerMessage || "Cartão recusado pela operadora.";
          setErr(msg);
          onFailed(msg);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      onFailed(msg);
    } finally {
      setLoading(false);
    }
  }

  if (pix) {
    const qrImg = pix.qrCodeUrl
      ? pix.qrCodeUrl
      : `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(pix.qrCode)}`;
    return (
      <div className="pt-4 space-y-5">
        <div className="text-center space-y-2">
          <h2 className="font-serif text-[1.6rem] font-bold">Pague com Pix para liberar</h2>
          <p className="text-muted-foreground text-sm">
            Assim que o pagamento for confirmado, você é levado(a) para a próxima etapa
            automaticamente.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="mx-auto w-fit rounded-lg bg-white p-3 border border-border">
            <img src={qrImg} alt="QR Code Pix" className="h-64 w-64" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Ou copie o código Pix:</p>
            <textarea
              readOnly
              value={pix.qrCode}
              className="w-full text-xs bg-muted rounded-md p-2 h-24 font-mono"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              onClick={() => navigator.clipboard.writeText(pix.qrCode)}
              className="mt-2 w-full rounded-xl bg-[#a4802b] hover:bg-[#8f6f22] text-white font-medium py-3 transition"
            >
              Copiar código Pix
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setPix(null);
              setTab("credit_card");
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 transition"
          >
            Prefiro pagar com cartão de crédito
          </button>
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Aguardando confirmação do pagamento...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-5">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-[1.6rem] leading-tight font-bold text-foreground">
          Finalize a homenagem de {name || "seu ente querido"}
        </h2>
        <p className="text-muted-foreground text-[14px]">
          Vídeo completo em até 24h no seu WhatsApp.
        </p>
      </div>

      <div className="rounded-xl bg-[#fdf6e3] border border-[#e8d9ae] p-4 flex items-center justify-between">
        <span className="text-sm text-[#8a6d3b] font-medium">Homenagem em vídeo</span>
        <span className="font-serif text-xl text-[#7a5f2d] font-bold">{PRICE_LABEL}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        <button
          onClick={() => setTab("pix")}
          className={`rounded-lg py-2.5 text-sm font-medium transition ${tab === "pix" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          Pix (instantâneo)
        </button>
        <button
          onClick={() => setTab("credit_card")}
          className={`rounded-lg py-2.5 text-sm font-medium transition ${tab === "credit_card" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          Cartão de crédito
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Seu e-mail (recibo)"
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c9a24a]/40"
        />
        <input
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          inputMode="numeric"
          placeholder="CPF (apenas números)"
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c9a24a]/40"
        />

        {tab === "credit_card" && (
          <>
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              inputMode="numeric"
              placeholder="Número do cartão"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c9a24a]/40"
            />
            <input
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
              placeholder="Nome impresso no cartão"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c9a24a]/40"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={cardExp}
                onChange={(e) => setCardExp(e.target.value)}
                placeholder="Validade (MM/AA)"
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c9a24a]/40"
              />
              <input
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value)}
                inputMode="numeric"
                placeholder="CVV"
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c9a24a]/40"
              />
            </div>
            <select
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm"
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}x de R$ {(47 / n).toFixed(2).replace(".", ",")} sem juros
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {err && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-4 shadow-md transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ShieldCheck className="h-5 w-5" />
        )}
        {tab === "pix" ? `Gerar Pix · ${PRICE_LABEL}` : `Pagar ${PRICE_LABEL}`}
      </button>

      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        Pagamento processado pela Pagar.me — ambiente seguro.
      </p>
    </div>
  );
}

function PaidStep({ whatsapp, name }: { whatsapp: string; name: string }) {
  return (
    <div className="pt-8 space-y-6 text-center">
      <div className="mx-auto grid place-items-center h-20 w-20 rounded-full bg-green-100">
        <Check className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="font-serif text-[1.8rem] leading-tight font-bold text-foreground">
        Pagamento confirmado 💛
      </h2>
      <p className="text-muted-foreground text-[15px] leading-relaxed max-w-sm mx-auto">
        A homenagem de <strong>{name || "seu ente querido"}</strong> entrou pra fila dos nossos
        artistas. Em até <strong>24h</strong> você recebe o vídeo completo no WhatsApp{" "}
        <span className="text-green-700 font-medium">{whatsapp}</span>.
      </p>
      <div className="rounded-xl border border-[#e8d9ae] bg-[#fdf6e3] p-4 text-sm text-[#8a6d3b] max-w-sm mx-auto">
        Guarde este número: qualquer dúvida, é só responder por lá.
      </div>
    </div>
  );
}


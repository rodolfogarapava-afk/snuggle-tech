const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1522390359324233809/M66ak2BymgqFmcn6UP5TnSTNyLcM8BSkelVVEJgpy4jf3Kaiqk_MWE-QCqdq9nue_mkI";

type LeadPayload = {
  stage: "lead" | "result" | "error";
  name?: string;
  whatsapp?: string;
  q1?: string;
  q2?: string;
  q3?: string;
  imageUrl?: string;
  processedUrl?: string;
  error?: string;
};

const stageColor: Record<LeadPayload["stage"], number> = {
  lead: 0xc9a24a,
  result: 0x2f9e6b,
  error: 0xb04a3f,
};

const stageTitle: Record<LeadPayload["stage"], string> = {
  lead: "🕯️ Novo lead — Alento",
  result: "✨ Homenagem gerada — Alento",
  error: "⚠️ Falha no processamento — Alento",
};

export async function sendDiscordEvent(payload: LeadPayload) {
  const fields: { name: string; value: string; inline?: boolean }[] = [];
  if (payload.name) fields.push({ name: "Ente querido", value: payload.name, inline: true });
  if (payload.whatsapp) fields.push({ name: "WhatsApp", value: payload.whatsapp, inline: true });
  if (payload.q1) fields.push({ name: "Quem é a estrela?", value: payload.q1 });
  if (payload.q2) fields.push({ name: "Lembrança que aquece o coração", value: payload.q2 });
  if (payload.q3) fields.push({ name: "Onde guardar a recordação", value: payload.q3 });
  if (payload.imageUrl) fields.push({ name: "Foto enviada", value: payload.imageUrl });
  if (payload.processedUrl) fields.push({ name: "Prévia gerada", value: payload.processedUrl });
  if (payload.error) fields.push({ name: "Erro", value: payload.error.slice(0, 900) });

  const body = {
    username: "Alento",
    embeds: [
      {
        title: stageTitle[payload.stage],
        color: stageColor[payload.stage],
        timestamp: new Date().toISOString(),
        fields,
        image: payload.processedUrl ? { url: payload.processedUrl } : undefined,
        thumbnail: payload.imageUrl && !payload.processedUrl ? { url: payload.imageUrl } : undefined,
      },
    ],
  };

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn("Discord webhook failed", e);
  }
}

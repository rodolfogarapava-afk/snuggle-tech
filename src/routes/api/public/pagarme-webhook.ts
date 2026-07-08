import { createFileRoute } from "@tanstack/react-router";

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1522390359324233809/M66ak2BymgqFmcn6UP5TnSTNyLcM8BSkelVVEJgpy4jf3Kaiqk_MWE-QCqdq9nue_mkI";
const TIKTOK_PIXEL_ID = "D96OF2RC77UFCF7ALSU0";
const TIKTOK_EVENTS_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const SITE_URL = "https://www.abracoeterno.store";

async function sha256Hex(value?: string) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return undefined;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isPaidEvent(type: string, status?: string) {
  return type.toLowerCase().includes("paid") || status === "paid";
}

async function sendTikTokPurchaseEvent({
  data,
  method,
}: {
  data: {
    id?: string;
    order_id?: string;
    amount?: number;
    status?: string;
    customer?: { name?: string; email?: string };
    metadata?: Record<string, string>;
  };
  method: string;
}) {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn("TIKTOK_ACCESS_TOKEN nao configurado.");
    return;
  }

  const orderId = data.order_id || data.id || `pagarme-${Date.now()}`;
  const value = data.amount ? data.amount / 100 : 1;
  const emailHash = await sha256Hex(data.customer?.email);
  const phoneHash = await sha256Hex(data.metadata?.whatsapp?.replace(/\D/g, ""));
  const externalIdHash = await sha256Hex(
    `${data.customer?.email || ""}:${data.metadata?.whatsapp || orderId}`,
  );

  const user = {
    ...(emailHash ? { email: emailHash } : {}),
    ...(phoneHash ? { phone: phoneHash } : {}),
    ...(externalIdHash ? { external_id: externalIdHash } : {}),
  };

  const response = await fetch(TIKTOK_EVENTS_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Access-Token": accessToken,
    },
    body: JSON.stringify({
      event_source: "web",
      event_source_id: TIKTOK_PIXEL_ID,
      data: [
        {
          event: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: orderId,
          user,
          page: {
            url: SITE_URL,
          },
          properties: {
            contents: [
              {
                content_id: "abraco-eterno-video",
                content_type: "product",
                content_name: "Abraço Eterno - Homenagem em vídeo",
              },
            ],
            value,
            currency: "BRL",
            payment_method: method,
            order_id: orderId,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn("TikTok Events API failed", response.status, await response.text());
  }
}

export const Route = createFileRoute("/api/public/pagarme-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: {
          type?: string;
          data?: {
            id?: string;
            order_id?: string;
            amount?: number;
            status?: string;
            payment_method?: string;
            customer?: { name?: string; email?: string };
            metadata?: Record<string, string>;
            last_transaction?: { acquirer_message?: string };
          };
        } = {};
        try {
          body = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const type = body.type || "unknown";
        const data = body.data || {};
        const amountBRL = data.amount ? (data.amount / 100).toFixed(2) : "?";
        const customer = data.customer?.name || data.customer?.email || "—";
        const method = data.payment_method || "?";
        const whatsapp = data.metadata?.whatsapp || "—";
        const ente = data.metadata?.ente || "—";
        const paid = isPaidEvent(type, data.status);

        let title = "💳 Pagar.me — evento";
        let color = 0x888888;
        if (paid) {
          title = "✅ Pagamento CONFIRMADO — Alento";
          color = 0x2f9e6b;
        } else if (type.includes("failed") || type.includes("refused")) {
          title = "❌ Pagamento recusado — Alento";
          color = 0xb04a3f;
        } else if (type.includes("created") || type.includes("pending")) {
          title = "🕒 Cobrança criada — aguardando";
          color = 0xc9a24a;
        } else if (type.includes("refunded") || type.includes("canceled")) {
          title = "↩️ Pagamento estornado/cancelado";
          color = 0x8a6d3b;
        }

        try {
          await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              username: "Alento · Pagar.me",
              embeds: [
                {
                  title,
                  color,
                  timestamp: new Date().toISOString(),
                  fields: [
                    { name: "Evento", value: type, inline: true },
                    { name: "Valor", value: `R$ ${amountBRL}`, inline: true },
                    { name: "Método", value: String(method), inline: true },
                    { name: "Cliente", value: customer, inline: true },
                    { name: "WhatsApp", value: whatsapp, inline: true },
                    { name: "Ente querido", value: ente, inline: true },
                    { name: "Order/Charge ID", value: data.id || data.order_id || "?" },
                  ],
                },
              ],
            }),
          });
        } catch (e) {
          console.warn("Discord notify failed", e);
        }

        if (paid) {
          try {
            await sendTikTokPurchaseEvent({ data, method: String(method) });
          } catch (e) {
            console.warn("TikTok purchase event failed", e);
          }
        }

        return new Response("ok");
      },
    },
  },
});

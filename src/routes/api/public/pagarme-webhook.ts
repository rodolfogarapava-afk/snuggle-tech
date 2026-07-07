import { createFileRoute } from "@tanstack/react-router";

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1522390359324233809/M66ak2BymgqFmcn6UP5TnSTNyLcM8BSkelVVEJgpy4jf3Kaiqk_MWE-QCqdq9nue_mkI";

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

        let title = "💳 Pagar.me — evento";
        let color = 0x888888;
        if (type.includes("paid")) {
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

        return new Response("ok");
      },
    },
  },
});

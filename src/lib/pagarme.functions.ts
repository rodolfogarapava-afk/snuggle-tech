import { createServerFn } from "@tanstack/react-start";

type Customer = {
  name: string;
  email: string;
  document?: string; // CPF
  phone?: string;
};

type Card = {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
  installments?: number;
};

type CreateOrderInput = {
  method: "pix" | "credit_card";
  amount: number; // cents
  description?: string;
  customer: Customer;
  card?: Card;
  metadata?: Record<string, string>;
};

function authHeader() {
  const key = process.env.PAGARME_SECRET_KEY;
  if (!key) throw new Error("PAGARME_SECRET_KEY não configurada.");
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

function splitPhone(raw?: string) {
  const digits = (raw || "").replace(/\D/g, "");
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  // Pagar.me exige DDD (2) + número (8 ou 9). Se o input for inválido, cai num fallback válido.
  const isValid = /^\d{10,11}$/.test(withoutCountry) && !/^0+$/.test(withoutCountry);
  const clean = isValid ? withoutCountry : "11999999999";
  return {
    area_code: clean.slice(0, 2),
    number: clean.slice(2),
    country_code: "55",
  };
}


export const createPagarmeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: CreateOrderInput) => data)
  .handler(async ({ data }) => {
    const phone = splitPhone(data.customer.phone);
    const document = (data.customer.document || "00000000000").replace(/\D/g, "");

    const payment =
      data.method === "pix"
        ? {
            payment_method: "pix",
            pix: { expires_in: 3600 },
          }
        : {
            payment_method: "credit_card",
            credit_card: {
              installments: data.card?.installments || 1,
              statement_descriptor: "ALENTO",
              card: {
                number: data.card!.number.replace(/\s/g, ""),
                holder_name: data.card!.holder_name,
                exp_month: data.card!.exp_month,
                exp_year: data.card!.exp_year,
                cvv: data.card!.cvv,
              },
            },
          };

    const body = {
      items: [
        {
          amount: data.amount,
          description: data.description || "Homenagem em vídeo — Alento",
          quantity: 1,
        },
      ],
      customer: {
        name: data.customer.name || "Cliente Alento",
        email: data.customer.email || "cliente@alento.app",
        type: "individual",
        document,
        phones: { mobile_phone: phone },
      },
      payments: [payment],
      metadata: data.metadata,
    };

    const res = await fetch("https://api.pagar.me/core/v5/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: authHeader(),
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      charges?: Array<{
        id?: string;
        status?: string;
        last_transaction?: {
          qr_code?: string;
          qr_code_url?: string;
          expires_at?: string;
          acquirer_message?: string;
          gateway_response?: { errors?: Array<{ message?: string }> };
        };
      }>;
      message?: string;
      errors?: Record<string, string[]>;
    };

    if (!res.ok) {
      const flatErrors = json?.errors
        ? Object.values(json.errors).flat().join(" · ")
        : "";
      return {
        success: false as const,
        error: flatErrors || json?.message || `HTTP ${res.status}`,
      };
    }

    const charge = json.charges?.[0];
    const tx = charge?.last_transaction;

    // Pagar.me pode devolver HTTP 200 com charge "failed" (ex.: telefone/CPF inválido).
    if (charge?.status === "failed" || (data.method === "pix" && !tx?.qr_code)) {
      const gatewayMsg = tx?.gateway_response?.errors?.[0]?.message;
      return {
        success: false as const,
        error:
          tx?.acquirer_message ||
          gatewayMsg ||
          "Pagamento recusado pelo Pagar.me. Verifique os dados (telefone, CPF, cartão) e tente novamente.",
      };
    }

    return {
      success: true as const,
      orderId: json.id!,
      chargeId: charge?.id,
      status: json.status,
      chargeStatus: charge?.status,
      pix: tx?.qr_code
        ? {
            qrCode: tx.qr_code,
            qrCodeUrl: tx.qr_code_url,
            expiresAt: tx.expires_at,
          }
        : undefined,
      acquirerMessage: tx?.acquirer_message,
    };
  });


export const getPagarmeOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const res = await fetch(`https://api.pagar.me/core/v5/orders/${data.orderId}`, {
      headers: { authorization: authHeader() },
    });
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      charges?: Array<{ status?: string }>;
    };
    return {
      status: json.status,
      chargeStatus: json.charges?.[0]?.status,
      paid: json.status === "paid" || json.charges?.[0]?.status === "paid",
    };
  });

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestSession } from "@/lib/auth";
import { ensureUser } from "@/lib/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANS = {
  estudio: { name: "Estudio", amount: 299, interval: "month" },
  pro: { name: "Pro", amount: 499, interval: "month" },
};

export async function POST(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rl = rateLimit({ key: `checkout:${session.uid}`, limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera unos segundos." },
      { status: 429 }
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === "sk_test_REPLACE_ME") {
    return NextResponse.json(
      {
        error:
          "La pasarela de pago aún no está activa. El propietario debe configurar STRIPE_SECRET_KEY en el entorno.",
      },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const plan = PLANS[String(body?.plan || "")];
  if (!plan) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const origin = request.headers.get("origin") || "https://sound-craft-vgjc.vercel.app";

  try {
    const user = await ensureUser(session);
    const stripe = new Stripe(secretKey);

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: plan.amount,
            recurring: { interval: plan.interval },
            product_data: {
              name: `SoundCraft ${plan.name}`,
              description: `Suscripción mensual al plan ${plan.name} de SoundCraft AI.`,
            },
          },
        },
      ],
      client_reference_id: user.id,
      metadata: { plan: body.plan, user_id: user.id, email: user.email },
      subscription_data: {
        metadata: { user_id: user.id, plan: body.plan },
      },
      customer_email: user.email || undefined,
      success_url: `${origin}/dashboard?upgrade=success`,
      cancel_url: `${origin}/planes?upgrade=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      // evita el checkbox de flujo explícito: la UI usa botones de precompra
      payment_method_collection: "always",
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("[api/stripe/checkout]", err.message);
    return NextResponse.json(
      { error: "No se pudo crear la sesión de pago. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
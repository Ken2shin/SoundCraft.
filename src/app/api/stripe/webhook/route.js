import { NextResponse } from "next/server";
import Stripe from "stripe";
import { setUserPlan } from "@/lib/db/repo";

export const runtime = "nodejs";

// Webhook de Stripe: verifica la firma y actualiza el plan tras el pago.
// En Vercel: Settings > Environment Variables > STRIPE_WEBHOOK_SECRET
// y en Stripe CLI: stripe listen --forward-to .../api/stripe/webhook
export async function POST(request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    console.error("[stripe/webhook] faltan STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  if (!signature) {
    return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  }

  let event;
  try {
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] firma inválida:", err.message);
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const plan = session?.metadata?.plan;
    const userId = session?.metadata?.user_id || session?.client_reference_id;
    await setUserPlan(userId, plan);
    console.log("[stripe/webhook] plan actualizado:", userId, plan);
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const userId = sub?.metadata?.user_id;
    if (userId) {
      await setUserPlan(userId, "free");
      console.log("[stripe/webhook] suscripción cancelada:", userId);
    }
  }

  return NextResponse.json({ received: true });
}
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { setUserPlan } from "@/lib/db/repo";

export const runtime = "nodejs";

const ALLOWED_PLANS = new Set(["estudio", "pro", "enterprise"]);

function planFromMetadata(metadata) {
  const p = metadata?.plan;
  return ALLOWED_PLANS.has(p) ? p : null;
}

async function syncPlanFromSubscription(sub, setUserPlanFn) {
  const userId = sub?.metadata?.user_id;
  const plan = planFromMetadata(sub?.metadata);
  if (userId && plan) {
    await setUserPlanFn(userId, plan);
    console.log("[stripe/webhook] plan sincronizado desde sub:", userId, plan);
    return true;
  }
  return false;
}

// Webhook de Stripe: verifica la firma y actualiza el plan tras el pago.
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

  // 1) Checkout completado (pago exitoso inmediato)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const plan = planFromMetadata(session?.metadata);
    const userId = session?.metadata?.user_id || session?.client_reference_id;
    if (plan && userId) {
      await setUserPlan(userId, plan);
      console.log("[stripe/webhook] checkout completado:", userId, plan);
    }
  }

  // 2) Suscripción creada (incluye trial, si aplica)
  if (event.type === "customer.subscription.created") {
    await syncPlanFromSubscription(event.data.object, setUserPlan);
  }

  // 3) Suscripción actualizada (cambio de plan, renovación, etc.)
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object;
    // Si la suscripción está activa o en trial, sincronizar plan
    if (sub.status === "active" || sub.status === "trialing") {
      await syncPlanFromSubscription(sub, setUserPlan);
    } else if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "past_due") {
      // Si se cancela o deja de pagar, bajar a free
      const userId = sub?.metadata?.user_id;
      if (userId) {
        await setUserPlan(userId, "free");
        console.log("[stripe/webhook] suscripción inactiva → free:", userId);
      }
    }
  }

  // 4) Suscripción eliminada/cancelada
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const userId = sub?.metadata?.user_id;
    if (userId) {
      await setUserPlan(userId, "free");
      console.log("[stripe/webhook] suscripción eliminada → free:", userId);
    }
  }

  return NextResponse.json({ received: true });
}
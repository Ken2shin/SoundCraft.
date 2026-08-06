import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getRequestSession } from "@/lib/auth";
import { ensureUser, setUserPlan } from "@/lib/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PLANS = new Set(["estudio", "pro", "enterprise"]);

function planFromPriceId(priceId) {
  if (!priceId) return null;
  if (priceId.includes("estudio") || priceId === "price_estudio") return "estudio";
  if (priceId.includes("pro") || priceId === "price_pro") return "pro";
  if (priceId.includes("enterprise") || priceId === "price_enterprise") return "enterprise";
  return null;
}

export async function GET(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === "sk_test_REPLACE_ME") {
    return NextResponse.json(
      { error: "Stripe no configurado en el servidor" },
      { status: 503 }
    );
  }

  try {
    const user = await ensureUser(session);
    if (!user.email) {
      return NextResponse.json({ error: "Usuario sin email" }, { status: 400 });
    }

    const stripe = new Stripe(secretKey);

    // Buscar cliente por email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 10,
    });

    if (customers.data.length === 0) {
      // No hay cliente en Stripe → plan free
      if (user.plan !== "free") {
        await setUserPlan(user.id, "free");
      }
      return NextResponse.json({ plan: "free", synced: true });
    }

    // Buscar suscripciones activas del cliente
    let activePlan = null;
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 10,
        expand: ["data.default_payment_method"],
      });

      for (const sub of subscriptions.data) {
        if (sub.status === "active" || sub.status === "trialing") {
          // Obtener plan desde metadata del precio o suscripción
          const priceId = sub.items.data[0]?.price?.id;
          const metadataPlan = sub.metadata?.plan || (priceId ? planFromPriceId(priceId) : null);
          if (ALLOWED_PLANS.has(metadataPlan)) {
            activePlan = metadataPlan;
            break;
          }
        }
      }
      if (activePlan) break;
    }

    const newPlan = activePlan || "free";
    if (user.plan !== newPlan) {
      await setUserPlan(user.id, newPlan);
    }

    return NextResponse.json({ plan: newPlan, synced: true, previousPlan: user.plan });
  } catch (err) {
    console.error("[api/stripe/refresh]", err.message);
    return NextResponse.json(
      { error: "Error sincronizando con Stripe" },
      { status: 500 }
    );
  }
}
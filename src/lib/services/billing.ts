import Stripe from "stripe";
import { prisma } from "@/lib/db";

export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "One LinkedIn autopilot, 30 runs / month, demo models.",
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    description: "Unlimited personal workflows, approvals, and your own API keys.",
  },
  {
    id: "team",
    name: "Team",
    price: 79,
    description: "Shared workspace foundation, admin, and higher limits.",
  },
] as const;

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function billingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO_MONTHLY);
}

export async function createCheckoutSession(user: { id: string; email: string; stripeCustomerId?: string | null }, plan: "pro" | "team") {
  const stripe = stripeClient();
  if (!stripe) throw new Error("Stripe is not configured");
  const price =
    plan === "team" ? process.env.STRIPE_PRICE_TEAM_MONTHLY : process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!price) throw new Error("Stripe price is not configured");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.APP_URL}/settings?billing=success`,
    cancel_url: `${process.env.APP_URL}/settings?billing=cancelled`,
    metadata: { userId: user.id, plan },
  });
  return session.url;
}

export async function createPortalSession(customerId: string) {
  const stripe = stripeClient();
  if (!stripe) throw new Error("Stripe is not configured");
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.APP_URL}/settings`,
  });
  return session.url;
}

export async function applyStripeEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan ?? "pro";
    if (!userId) return;
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
        stripeSubscriptionId:
          typeof session.subscription === "string" ? session.subscription : undefined,
        stripeStatus: "active",
      },
    });
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!user) return;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeStatus: subscription.status,
        plan: subscription.status === "active" ? user.plan : "free",
      },
    });
  }
}

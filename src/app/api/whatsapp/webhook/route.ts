import { NextRequest, NextResponse } from "next/server";
import { BRAND } from "@/lib/format";

/**
 * Clean Crate WhatsApp Cloud API Automated Webhook (`/api/whatsapp/webhook`)
 *
 * When connected to Meta WhatsApp Business Cloud API (via WHATSAPP_VERIFY_TOKEN & WHATSAPP_ACCESS_TOKEN),
 * this endpoint automatically responds to incoming customer WhatsApp messages whenever the owner is offline
 * or away, answering questions about Abuja & Lokoja delivery, pickup, pack sizes, and available products.
 */

function buildAutomatedCleanCrateReply(incomingText: string): string {
  const q = incomingText.toLowerCase();

  if (q.includes("price") || q.includes("how much") || q.includes("size") || q.includes("kg") || q.includes("pack")) {
    return [
      `Hello! Welcome to *Clean Crate (CleanCrate.ng)* — _Clean Food. Simply Packaged._`,
      ``,
      `We package our staples fresh according to your household, gift, or bulk needs (pouch, jar, or crate).`,
      `Please reply with:`,
      `1. *Items you want* (Ijebu Garri, Yellow Garri, Kuli-Kuli, Fermented Iru, Smoked Ponmo, Kiln-Dried Fish, or Curated Crates)`,
      `2. *How much / what pack size you need*`,
      `3. *Your State* (Abuja or Lokoja)`,
      ``,
      `Our owner will confirm your exact pack quote right away!`,
    ].join("\n");
  }

  if (q.includes("delivery") || q.includes("pickup") || q.includes("abuja") || q.includes("lokoja") || q.includes("location")) {
    return [
      `Hello from *Clean Crate (CleanCrate.ng)*!`,
      ``,
      `We operate and deliver across *Abuja* and *Lokoja*.`,
      `Both *doorstep delivery* and *pickup* in Abuja or Lokoja are arranged directly with you here on WhatsApp once you share your items and preferred quantity.`,
    ].join("\n");
  }

  return [
    `Hello! Thank you for messaging *Clean Crate (CleanCrate.ng)* — _Clean Food. Simply Packaged._`,
    ``,
    `If our owner is briefly away from the phone, our automated concierge has logged your message.`,
    `To help us prepare your quote quickly, please reply with:`,
    `• *Your Name*`,
    `• *Your State:* Abuja or Lokoja`,
    `• *Products Needed:* (Garri, Kuli-Kuli, Iru, Ponmo, Dried Fish, or Curated Crate)`,
    `• *Preferred Pack Size / Quantity & Delivery or Pickup preference*`,
    ``,
    `We will respond to you shortly! (${BRAND.hours})`,
  ].join("\n");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "cleancrate_verify_token";

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    service: "Clean Crate WhatsApp Automation Webhook",
    status: "ready",
    locations: ["Abuja", "Lokoja"],
    note: "Provides 24/7 automated responses for Clean Crate orders, packaging inquiries, and Abuja/Lokoja delivery.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support direct simulation/testing from the website concierge or Meta Cloud API payload
    if (typeof body?.testMessage === "string") {
      return NextResponse.json({
        ok: true,
        automatedReply: buildAutomatedCleanCrateReply(body.testMessage),
      });
    }

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    const fromPhone = message?.from;
    const textBody = message?.text?.body || "";
    const phoneNumberId = change?.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (fromPhone && textBody) {
      const replyText = buildAutomatedCleanCrateReply(textBody);

      if (accessToken && phoneNumberId) {
        await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: fromPhone,
            type: "text",
            text: { body: replyText },
          }),
        });
      }

      return NextResponse.json({ ok: true, replied: Boolean(accessToken && phoneNumberId), replyText });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}

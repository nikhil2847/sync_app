import { authenticate } from "../shopify.server";
import db from "../db.server";

import crypto from "crypto";
import { json } from "@remix-run/node"; // Use Remix's response utilities

const SHOPIFY_SECRET = process.env.SHOPIFY_API_SECRET;

export const action = async ({ request }) => {
  // const { topic, shop, session } = await authenticate.webhook(request);
  const { topic, shop, session } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  const hmacHeader = request.headers.get("X-Shopify-Hmac-SHA256");
  const rawBody = await request.text();

  // Compute the HMAC
  const generatedHmac = crypto
    .createHmac("sha256", SHOPIFY_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  // Verify if the HMACs match
  if (generatedHmac !== hmacHeader) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Webhook verified successfully!");

  return json({ success: true });
};

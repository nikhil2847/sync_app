

// import { authenticate } from "../shopify.server";
// import crypto from "crypto";
// import { json } from "@remix-run/node"; // Use Remix's response utilities

// const SHOPIFY_SECRET = '4f45521308c9ce4c239f53c96ffa2cc0';

// export const action = async ({ request }) => {
//   const hmacHeader = request.headers.get("X-Shopify-Hmac-SHA256");
//   if (!hmacHeader) {
//     return json({ error: "Missing HMAC header" }, { status: 400 });
//   }

//   const rawBody = await request.text();

//   // Compute the HMAC
//   const generatedHmac = crypto
//     .createHmac("sha256", SHOPIFY_SECRET)
//     .update(rawBody, "utf8")
//     .digest("base64");

//   // Verify if the HMACs match
//   if (generatedHmac !== hmacHeader) {
//     return json({ error: "Unauthorized" }, { status: 401 });
//   }

//   console.log("Webhook verified successfully!");

//   return json({ success: true });
// };

import crypto from "crypto";
import { json } from "@remix-run/node";

const SHOPIFY_SECRET = '4f45521308c9ce4c239f53c96ffa2cc0'; // Ideally, use process.env here.

export const action = async ({ request }) => {
  const hmacHeader = request.headers.get("X-Shopify-Hmac-SHA256");
  if (!hmacHeader) {
    return json({ error: "Missing HMAC header" }, { status: 400 });
  }

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

  // ✅ Dynamically import server-only module here (after verification)
  const { authenticate } = await import("../shopify.server");

  // Optional: use Shopify logic after this point
  // const { topic, shop, session } = await authenticate.webhook(request);
  // console.log(`Received ${topic} webhook for ${shop}`);

  return json({ success: true });
};

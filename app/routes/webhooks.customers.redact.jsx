// import { authenticate } from "../shopify.server";
// import crypto from "crypto";
// import { json } from "@remix-run/node"; // Use Remix's response utilities

// // const SHOPIFY_SECRET = process.env.SHOPIFY_API_SECRET;
// const SHOPIFY_SECRET = '4f45521308c9ce4c239f53c96ffa2cc0';
// export const action = async ({ request }) => {
//   // const { shop, topic } = await authenticate.webhook(request);
//   // const { topic, shop, session } = await authenticate.webhook(request);
//   // Implement handling of mandatory compliance topics
//   // See: https://shopify.dev/docs/apps/build/privacy-law-compliance
//   // console.log(`Received ${topic} webhook for ${shop}`);
//   // console.log(JSON.stringify(payload, null, 2));


//   const hmacHeader = request.headers.get("X-Shopify-Hmac-SHA256");
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


import { authenticate } from "../shopify.server";
import crypto from "crypto";
import { json } from "@remix-run/node"; // Use Remix's response utilities

const SHOPIFY_SECRET = '4f45521308c9ce4c239f53c96ffa2cc0';

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

  return json({ success: true });
};
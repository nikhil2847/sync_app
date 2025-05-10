
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
export const loader = async ({ request }) => {

    await authenticate.admin(request);
    return null;
 
};

// Query and Mutation to get and Post

export const action = async ({ request }) => {


  const { admin } = await authenticate.admin(request);
  const formData = new URLSearchParams(await request.text());
  const stockQuantity = Number(formData.get("stockQuantity")) || 0;

  const sku = formData.get("sku");

  const sessionToken = formData.get("sessionToken");
  if (!sessionToken) {
    throw new Response("Unauthorized", { status: 401 });
  }

 const productQuery = await admin.graphql(
    `#graphql
     query GetProductQuantityBySKU($sku: String) {
       products(first: 250, query: $sku) {
         edges {
           node {
             id
             title
             variants(first: 250) {
               edges {
                 node {
                   id
                   sku
                   inventoryQuantity
                 }
               }
             }
           }
         }
       }
     }`,
    {
      variables: { sku },
      headers: {
        Authorization: `Bearer ${sessionToken}`, // Pass the sessionToken here
      },
    }
  );

  const productQueryResponse = await productQuery.json();

  if (!productQueryResponse.data || !productQueryResponse.data.products.edges.length) {
    console.error(`No product found for SKU ${sku}.`);
    return json({ errors: [{ field: `${sku}`, message: "No product found for this SKU." }] });
  }

  // Step 2: Loop through all the variants and update only the one with the matching SKU
  const productVariants = productQueryResponse.data.products.edges[0].node.variants.edges;

  // Only proceed if a variant with the matching SKU is found
  const matchingVariant = productVariants.find(variant => variant.node.sku === sku);
  if (!matchingVariant) {
    console.error(`Failed to sync: No variant found with the specified SKU ${sku}`);

    return json({ errors: [{ field: `${sku}`, message: "No variant found with the specified SKU." }] });

  }

  console.log(`Successfully found variant for SKU ${sku}. Proceeding to update inventory.`);
  const inventoryQuantity = matchingVariant.node.inventoryQuantity;
  const variantId = matchingVariant.node.id;


  // Step 3: Fetch inventory item and location data for the matching variant
  const productVariantQuery = await admin.graphql(
    `#graphql
     query getProductVariantById($variantId: ID!) {
       productVariant(id: $variantId) {
         id
         sku
         inventoryItem {
           id
           inventoryLevels(first: 250) {
             edges {
               node {
                 id
                 location {
                   id
                   name
                 }
               }
             }
           }
         }
       }
     }`,
    {
      variables: { variantId },
      headers: {
        Authorization: `Bearer ${sessionToken}`, // Pass the sessionToken here
      },
    }
  );

  const productVariantResponse = await productVariantQuery.json();
  const inventoryData = productVariantResponse.data.productVariant.inventoryItem.inventoryLevels.edges;

  if (inventoryData && inventoryData.length > 0) {
    const inventoryItemId = productVariantResponse.data.productVariant.inventoryItem.id;
    const locationId = inventoryData[0].node.location.id;

    // Step 4: Adjust stock for the matching variant
    const input = {
      name: "available",
      reason: "correction",
      referenceDocumentUri: "logistics://some.warehouse/take/2023-01-23T13:14:15Z",
      quantities: [
        {
          inventoryItemId: inventoryItemId,
          locationId: locationId,
          quantity: stockQuantity,
          compareQuantity: inventoryQuantity, // Use the variant's current inventory quantity
        },
      ],
    };

    const response = await admin.graphql(
      `#graphql
      mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          inventoryAdjustmentGroup {
            reason
            referenceDocumentUri
            changes {
              name
              delta
              quantityAfterChange
            }
          }
          userErrors {
            code
            field
            message
          }
        }
      }`,
      {
        variables: { input },
        headers: {
          Authorization: `Bearer ${sessionToken}`, // Pass the sessionToken here
        },
      }
    );

    const responseJson = await response.json();

    if (responseJson.errors || responseJson.data.inventorySetQuantities.userErrors.length > 0) {
      return json({ errors: responseJson.errors || responseJson.data.inventorySetQuantities.userErrors });

    }
  }

  return json({ success: true, sku, sessionToken, stockQuantity, message: "Stock adjusted successfully." });




};
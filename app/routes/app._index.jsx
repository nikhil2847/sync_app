import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  Collapsible,
  InlineStack,
  TextContainer,
  Link,
  Icon,
  InlineGrid
} from "@shopify/polaris";
import { PlusIcon, MinusIcon } from '@shopify/polaris-icons';
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    #graphql
    query {
      products(first: 100) {
        edges {
          node {
            id
            variants(first: 100) {
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
    }
  `);

  const result = await response.json();

  const variants = result.data.products.edges.flatMap((p) =>
    p.node.variants.edges.map((v) => v.node)
  );

  const data = {
    totalProducts: result.data.products.edges.length,
    totalVariants: variants.length,
    missingSkuCount: variants.filter((v) => !v.sku).length,
    outOfStockCount: variants.filter((v) => v.inventoryQuantity === 0).length,
    inStockCount: variants.filter((v) => v.inventoryQuantity > 0).length,
  };

  return json(data);
};

export default function Index() {
  const [open, setOpen] = useState(false);
  const [openIndexes, setOpenIndexes] = useState([]);
  // const handleToggle = useCallback(() => setOpen((open) => !open), []);
  const handleToggle = (index) => {
    setOpenIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };
  // const handleToggle = (index) => {
  //   setOpenIndexes((prev) =>
  //     prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
  //   );
  // };



  const {
    totalProducts,
    missingSkuCount,
    outOfStockCount,
    totalVariants,
    inStockCount,
  } = useLoaderData();

  const faqs = [
    {
      question: "How does the sync process work?",
      answer: "Our sync app connects with your data sources and updates your information in real-time or at scheduled intervals. You can manually trigger a sync, enable automatic syncing, or set up custom API syncs for dynamic data management."
    },
    {
      question: "Can I schedule automatic syncs?",
      answer: "Yes! Our app allows you to configure scheduled syncs at specific intervals. You can set up automatic updates to ensure your data stays current without manual intervention."
    },
    {
      question: "What should I do if my sync fails?",
      answer: "If a sync fails, check the Sync Logs section for error messages and details. Common issues include API authentication failures, incorrect data formats, or server timeouts. If the problem persists, reach out to our support team for assistance."
    },
    {
      question: "How do I configure a custom API sync?",
      answer: "Go to Dynamic API Settings and enter your API credentials, endpoint URLs, and required parameters. Once configured, you can trigger custom syncs on demand or schedule them based on your needs."
    },
    {
      question: "Will my data be overwritten during syncing?",
      answer: "No, your data is updated based on predefined rules. You can configure whether to append new records, update existing ones, or replace outdated entries to ensure data consistency without accidental loss."
    }
  ];

  // const toggleFAQ = (index) => {
  //   setOpenIndexes((prev) =>
  //     prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
  //   );
  // };

  // Debugging the openIndexes state
  // useEffect(() => {
  //   console.log("openIndexes updated:", openIndexes);
  // }, [openIndexes]);

  return (
    <Page>
      <TitleBar title="Dashboard">
        {/* <Button variant="primary" onClick={generateProduct}>
          Generate a product
        </Button> */}
      </TitleBar>

      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 2 }} gap="400">
              <Card sectioned>
                <Text variant="heading2xl" as="p">{totalProducts}</Text>
                <Text variant="headingMd">🛍 Total Products</Text>

              </Card>
              <Card sectioned>

                <Text variant="heading2xl" as="p">{totalVariants}</Text>
                <Text variant="headingMd">🧩 Total Variants</Text>
              </Card>
              <Card sectioned>
                <Text variant="heading2xl" as="p">{missingSkuCount}</Text>
                <Text variant="headingMd">❌ Missing Variants SKUs</Text>
              </Card>

              <Card sectioned>
                <InlineGrid columns={2} gap="200">
                  <BlockStack align="center">
                    <Text variant="heading2xl" as="p">{inStockCount}</Text>
                    <Text variant="headingMd">✅ In Stock</Text>
                  </BlockStack>

                  <BlockStack align="center">
                    <Text variant="heading2xl" as="p">{outOfStockCount}</Text>
                    <Text variant="headingMd">⚠️ Out of Stock</Text>
                  </BlockStack>
                </InlineGrid>
              </Card>

            </InlineGrid>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h1" variant="headingMd">
                    Hi 👋 Welcome to Product Sync App!
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Easily sync and manage your product stock in just a few clicks! Use manual SKU entry, bulk CSV/XML uploads, or vendor API to keep your inventory up to date.
                  </Text>
                </BlockStack>

                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    🔄 Get Started with Product Sync
                  </Text>
                  <Text variant="bodyMd">
                    Choose a sync method below to update your store’s inventory effortlessly.
                  </Text>
                </BlockStack>

                <InlineStack gap="300">
                  <Text variant="bodyMd" as="p">
                    Manually update stock for specific products using SKU.
                  </Text>
                </InlineStack>

                <InlineStack gap="300">
                  <Text variant="bodyMd" as="p">
                    Upload a CSV or XML file with SKU & Stock quantity to update multiple products at once.
                  </Text>
                </InlineStack>

                <InlineStack gap="300">
                  <Text variant="bodyMd" as="p">
                    Connect with your vendor’s API for real-time stock updates.
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            {faqs.map((faq, index) => {
              const isOpen = openIndexes.includes(index);
              const collapsibleId = `faq-collapsible-${index}`;
              const test = "test";
              return (
                // <Card key={index} sectioned>
                //   <BlockStack gap="300">
                //     <Button
                //       onClick={() => handleToggle(index)}
                //       ariaExpanded={isOpen}
                //       ariaControls={`faq-${index}`}
                //       ariaLabel={`Toggle FAQ ${index + 1}`}
                //     >
                //       {/* {isOpen ? (
                //         <Icon source={MinusIcon} color="base" />
                //       ) : (
                //         <Icon source={PlusIcon} color="base" />
                //       )} */}
                //       {faq.question}
                //     </Button>
                //     <Collapsible
                //       open={isOpen}
                //       id={`faq-${index}`}
                //       transition={{ duration: '500ms', timingFunction: 'ease-in-out' }}
                //       expandOnPrint
                //     >
                //       <Text as="p" variant="bodyMd">
                //         {faq.answer}
                //       </Text>
                //     </Collapsible>
                //   </BlockStack>
                // </Card>
                <Card key={index} padding="400" roundedAbove="sm">
                  <BlockStack gap="300" leftAlign="start"
                  >
                    <Button
                      onClick={() => handleToggle(index)}
                      ariaExpanded={isOpen}
                      ariaControls={collapsibleId}
                      ariaLabel={`Toggle FAQ ${index + 1}`}
                      variant="heading"
                      icon={isOpen ? <Icon source={MinusIcon} color="base" /> : <Icon source={PlusIcon} color="base" />}
                      iconAlign="left"
                      fullWidth
                      accessibilityLabel={`Toggle FAQ ${index + 1}`}
                      textAlign="left"


                    >
                      <span style={{ fontSize: '14px', textAlign: 'left', fontWeight: 600 }}>   {faq.question}</span>
                    </Button>

                    <Collapsible
                      open={isOpen}
                      id={collapsibleId}
                      transition={{ duration: '500ms', timingFunction: 'ease-in-out' }}
                      expandOnPrint
                    >
                      <Text style={{ fontSize: '18px', fontWeight: 600 }}>
                        {faq.answer}
                      </Text>
                    </Collapsible>
                  </BlockStack>
                </Card>
              );
            })}



          </Layout.Section>

        </Layout>
      </BlockStack>
    </Page>
  );
}

import { useState, useCallback } from "react";
import {
  Page, Layout, Text, Card, Button, BlockStack, TextField, Select, Toast, Frame
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { useOutletContext } from "@remix-run/react";
// 🟢 Loader to fetch initial settings
export async function loader({ request }) {
  await authenticate.admin(request);
  let setting = await db.setting.findFirst();
  return json(setting || {});
}

// 🟢 Action to handle form submission
export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Invalid request method" }, { status: 405 });
  }

  let formData = await request.formData();
  let setting = Object.fromEntries(formData);

  try {
    let updatedSetting = await db.setting.upsert({
      where: { id: 1 },
      update: {
        apiEndpoint: setting.apiEndpoint,
        format: setting.format,
        SKU: setting.SKU,
        Stock: setting.Stock,
      },
      create: {
        id: 1,
        apiEndpoint: setting.apiEndpoint,
        format: setting.format,
        SKU: setting.SKU,
        Stock: setting.Stock,
      },
    });

    console.log("updatedSetting", updatedSetting)

    return json({ success: true, updatedSetting });

  } catch (error) {
    console.error("Error saving settings:", error);
    return json({ error: "Failed to save settings: " + error.message }, { status: 500 });
  }
}

// 🟢 Main Component
export default function Index() {
  const setting = useLoaderData();
  const fetcher = useFetcher();
  const [formState, setFormState] = useState(setting);
  const [toastActive, setToastActive] = useState(false);
  const { sessionToken } = useOutletContext();
  const toggleToast = useCallback(() => setToastActive((active) => !active), []);

  const isSaving = fetcher.state !== "idle";

  console.log("isSaving", isSaving)

  if (fetcher.data?.success) {
    shopify.toast.show(`Setting saved successfully`);
  }

  return (
    <Frame>
      <Page>
        <TitleBar title="Dynamic Api Settings" />
        <BlockStack gap="500">
          <Layout>
            <Layout.Section>
              <Card>
                <Text as="h2" variant="headingMd">Store API Details</Text>
                <br />
                <BlockStack gap="4">
                  <fetcher.Form method="POST">
                    <TextField
                      label="Write your API Endpoint"
                      value={formState?.apiEndpoint || ""}
                      onChange={(value) => setFormState({ ...formState, apiEndpoint: value })}
                      name="apiEndpoint"
                    />
                    <Select
                      label="Select format"
                      options={[
                        // { label: "XML", value: "XML" },
                        { label: "CSV", value: "CSV" },
                        { label: "TXT", value: "TXT" }
                      ]}
                      value={formState?.format || ""}
                      onChange={(value) => setFormState({ ...formState, format: value })}
                      name="format"
                    />
                    <br />

                    <TextField
                      label="Write your SKU Field Name of API"
                      value={formState?.SKU || ""}
                      onChange={(value) => setFormState({ ...formState, SKU: value })}
                      name="SKU"
                    />
                    <br />
                    <TextField
                      label="Write your Stock Field Name of API"
                      value={formState?.Stock || ""}
                      onChange={(value) => setFormState({ ...formState, Stock: value })}
                      name="Stock"
                    />
                    <br />

                    <Button submit disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Details"}
                    </Button>
                  </fetcher.Form>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
        <br />
        <Layout>
          {/* Welcome & Info Section */}
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h1" variant="headingMd">
                  Need a Custom Inventory API Integration App for your Store? 🤔
                </Text>
                <Text variant="bodyMd" as="p">
                  If you have a complex inventory API that needs integration, we've got you covered! 🚀 Our expert developers specialize in seamless API integrations tailored to your business needs.
                  <br />
                  📩 Contact us today, and let’s make your inventory management effortless! ✅
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section> </Layout>
      </Page>
      {fetcher.data?.success && toastActive && (
        <Toast content="Fields updated successfully!" onDismiss={toggleToast} />
      )}
      {fetcher.data?.error && (
        <Toast content={fetcher.data.error} error onDismiss={toggleToast} />
      )}
    </Frame>
  );
}

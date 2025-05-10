import { useState, useCallback, useEffect } from "react";
import { Page, Layout, Text, Card, Button, BlockStack, TextField, Select, Toast, Frame } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import db from "../db.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

// 📌 Fix: `loader` function - Correct relation usage
export async function loader({ request }) {
    await authenticate.admin(request); // Authenticate the request

    let history = await db.history.findFirst({
        include: {
            logs: true, // ✅ Fix: Correct relation usage
        }
    });

    return json(history || {}); // Return empty object if no data
}

// 📌 Fix: `action` function - Correct `logs` handling
export async function action({ request }) {
    let formData = await request.formData();
    let logsjson = formData.get("logs"); // Ensure this is correctly sent as a JSON string
    let sessionId = formData.get("sessionId");

    let logs = [];

    try {
        logs = JSON.parse(logsjson); // Parse logs
        if (!Array.isArray(logs)) {
            throw new Error("Logs should be an array");
        }
    } catch (error) {
        console.error("Error parsing logs:", error);
        return json({ success: false, error: "Invalid logs format" }, { status: 400 });
    }

    console.log("Received Logs:", logs); // Debugging logs

    try {
        // ✅ Find the latest history entry within the last 1 hour
        const oneHourAgo = new Date(Date.now() - 3600 * 1000);

        let existingHistory = await db.history.findFirst({
            where: {
                postType: "stock_adjustment",
                startedAt: { gte: oneHourAgo }, // ✅ Check if a sync was done in the last 1 hour
            },
            orderBy: { startedAt: "desc" }, // Get the latest sync
        });

        let updatedHistory;

        // ✅ If an existing history is found in the last hour, check for reload condition
        if (existingHistory && existingHistory.sessionId === sessionId) {

            updatedHistory = await db.history.update({
                where: { id: existingHistory.id },
                data: { Status: "Completed", published: "yes" },
            });
        } else {
            // ✅ If sessionId is different (app reloaded), create new history
            updatedHistory = await db.history.create({
                data: {
                    postType: "stock_adjustment",
                    startedAt: new Date(),
                    sessionId, // Store session ID
                    published: "yes",
                    Status: "Completed",
                },
            });
        }


        // ✅ Store logs under the correct history
        const logEntries = logs.map(log => ({
            historyId: updatedHistory.id,
            sku: log.sku,
            stock: parseInt(log.stock, 10) || 0,
            message: log.message || "No message",
            status: log.status || "Unknown",
            timestamp: new Date(),
        }));

        await db.logDetail.createMany({ data: logEntries });

        return json({ success: true, history: updatedHistory });

    } catch (error) {
        console.error("Action Error:", error);
        return json({ success: false, error: "Failed to save history: " + error.message }, { status: 500 });
    }
}





// 📌 Fix: Ensure correct form handling in React component
export default function Index() {
    const history = useLoaderData();
    const [formState, setFormState] = useState(history || {});
    const [toastActive, setToastActive] = useState(false);
    const toggleToast = useCallback(() => setToastActive((active) => !active), []);
    const toastMarkup = toastActive ? (
        <Toast content="Fields updated successfully!" onDismiss={toggleToast} />
    ) : null;

    return (
        <Frame>
            <Page>
                <TitleBar title="Stock Adjustment" />
                <BlockStack gap="500">
                    <Layout>
                        <Layout.Section>
                            <Card>
                                <Text as="h2" variant="headingMd">
                                    Store API Details
                                </Text>
                                <br />
                                <BlockStack gap="4">
                                    <form method="POST">
                                        <TextField
                                            label="postType"
                                            value={formState?.postType || ""}
                                            onChange={(value) => setFormState({ ...formState, postType: value })}
                                            name="postType"
                                        />

                                        <TextField
                                            label="Start Date"
                                            type="datetime-local"
                                            value={formState?.startedAt ? new Date(formState.startedAt).toISOString().slice(0, 16) : ""}
                                            onChange={(value) => setFormState({ ...formState, startedAt: value })}
                                            name="startedAt"
                                        />

                                        <TextField
                                            label="Published Date"
                                            type="date"
                                            value={formState?.published || ""}
                                            onChange={(value) => setFormState({ ...formState, published: value })}
                                            name="published"
                                        />

                                        <Select
                                            label="Status"
                                            options={[
                                                { label: "Pending", value: "Pending" },
                                                { label: "In Progress", value: "In Progress" },
                                                { label: "Completed", value: "Completed" },
                                            ]}
                                            value={formState?.Status || "Pending"}
                                            onChange={(value) => setFormState({ ...formState, Status: value })}
                                            name="Status"
                                        />

                                        <TextField
                                            label="Log Details"
                                            multiline={4}
                                            value={formState?.logs ? JSON.stringify(formState.logs, null, 2) : ""}
                                            onChange={(value) => setFormState({ ...formState, logs: value })}
                                            name="logs"
                                        />

                                        <TextField
                                            label="SKU"
                                            value={formState?.SKU || ""}
                                            onChange={(value) => setFormState({ ...formState, SKU: value })}
                                            name="SKU"
                                        />

                                        <TextField
                                            label="Stock"
                                            type="number"
                                            value={formState?.Stock || ""}
                                            onChange={(value) => setFormState({ ...formState, Stock: value })}
                                            name="Stock"
                                        />

                                        <br />

                                        <Button submit={true}>Save Details</Button>
                                    </form>
                                </BlockStack>
                            </Card>
                        </Layout.Section>
                    </Layout>
                </BlockStack>
            </Page>
            {toastMarkup}
        </Frame>
    );
}

import { useState, useCallback } from "react";
import {
    Page, Layout, Text, Card, Button, Frame, Toast, IndexTable, Modal, Pagination,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import db from "../db.server";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// ✅ Server Loader: Get History Logs with Log Details
export async function loader({ request }) {
    await authenticate.admin(request);
    const history = await db.history.findMany({
        orderBy: { startedAt: "desc" },
        include: { logs: true },
    });
    return json(history);
}

// ✅ Action: Handle Delete
export async function action({ request }) {
    const formData = await request.formData();
    const actionType = formData.get("action");
    const ids = formData.getAll("ids").map(Number);

    if (actionType === "delete" && ids.length > 0) {
        await db.history.deleteMany({ where: { id: { in: ids } } });
        return json({ success: true });
    }

    return json({ error: "Unknown action" }, { status: 400 });
}

export default function Index() {
    const historyData = useLoaderData();
    const fetcher = useFetcher();

    const [selectedIds, setSelectedIds] = useState([]);
    const [toastActive, setToastActive] = useState(false);
    const [modalActive, setModalActive] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Modal Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const logsPerPage = 10;

    const toggleToast = useCallback(() => setToastActive((active) => !active), []);
    const toggleModal = useCallback(() => {
        setModalActive((active) => !active);
        setCurrentPage(1); // Reset pagination when modal closes
    }, []);

    const handleRowClick = (entry) => {
        setSelectedEntry(entry);
        setModalActive(true);
    };

    const handleSingleDelete = (id, e) => {
        e.stopPropagation();
        fetcher.submit({ action: "delete", ids: [id] }, { method: "POST" });
        toggleToast();
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        const formData = new FormData();
        formData.append("action", "delete");
        selectedIds.forEach(id => formData.append("ids", id));
        setDeleting(true);
        fetcher.submit(formData, { method: "POST" }).then(() => {
            setDeleting(false);
            setSelectedIds([]);
            toggleToast();
        });
    };

    const handleSelectionChange = (selectedItems) => {
        if (selectedItems === "page") {
            setSelectedIds(historyData.map(entry => entry.id));
        } else if (selectedItems === "none") {
            setSelectedIds([]);
        } else if (Array.isArray(selectedItems)) {
            setSelectedIds((prevSelected) => {
                let newSelection = [...prevSelected];
                selectedItems.forEach(item => {
                    if (newSelection.includes(item)) {
                        newSelection = newSelection.filter(id => id !== item);
                    } else {
                        newSelection.push(item);
                    }
                });
                return newSelection;
            });
        }
    };

    const exportLogsToCSV = () => {
        if (!selectedEntry || !selectedEntry.logs.length) return;

        const headers = ["SKU", "Stock", "Message", "Status", "Timestamp"];
        const rows = selectedEntry.logs.map(log => [
            log.sku,
            log.stock || "0",
            `"${log.message}"`,
            log.status,
            new Date(log.timestamp).toLocaleString(),
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");

        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `logs-history-${selectedEntry.id}.csv`);
        link.click();
    };

    // Pagination Logic
    const paginatedLogs = selectedEntry?.logs.slice(
        (currentPage - 1) * logsPerPage,
        currentPage * logsPerPage
    );

    return (
        <Frame>
            <Page>
                <TitleBar title="API Sync History" />
                <Layout>
                    <Layout.Section>
                        <Card>
                            <Text as="h2" variant="headingMd">Sync Logs</Text>
                            <br />

                            {historyData.length === 0 ? (
                                <Text>No history logs available.</Text>
                            ) : (
                                <IndexTable
                                    resourceName={{ singular: "history", plural: "histories" }}
                                    itemCount={historyData.length}
                                    headings={[
                                        { title: "No." },
                                        // { title: "ID" },
                                        { title: "Post Type" },
                                        { title: "Started At" },
                                        // { title: "Status" },
                                        { title: "Actions" },
                                    ]}
                                    selectedItemsCount={selectedIds.length}
                                    onSelectionChange={handleSelectionChange}
                                    selectable
                                >
                                    {historyData.map((entry, index) => (
                                        <IndexTable.Row
                                            id={entry.id}
                                            key={entry.id}
                                            selected={selectedIds.includes(entry.id)}
                                            onClick={() => handleRowClick(entry)}
                                        >
                                            <IndexTable.Cell>{index + 1}</IndexTable.Cell>
                                            {/* <IndexTable.Cell>{entry.id}</IndexTable.Cell> */}
                                            <IndexTable.Cell>{entry.postType}</IndexTable.Cell>
                                            <IndexTable.Cell>{new Date(entry.startedAt).toLocaleString()}</IndexTable.Cell>
                                            {/* <IndexTable.Cell>{entry.status}</IndexTable.Cell> */}
                                            <IndexTable.Cell>
                                                <Button
                                                    plain
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRowClick(entry);
                                                    }}
                                                >
                                                    View Logs
                                                </Button>
                                            </IndexTable.Cell>
                                        </IndexTable.Row>
                                    ))}
                                </IndexTable>
                            )}

                            <br />
                            <Button disabled={selectedIds.length === 0 || deleting} onClick={handleBulkDelete} destructive>
                                {deleting ? "Deleting..." : "Bulk Delete Selected"}
                            </Button>
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>

            {toastActive && <Toast content="Deleted successfully!" onDismiss={toggleToast} />}

            {/* ✅ Modal with Pagination + Export */}
            {modalActive && selectedEntry && (
                <Modal
                    open={modalActive}
                    onClose={toggleModal}
                    title={`History Details (ID: ${selectedEntry.id})`}
                    primaryAction={{ content: "Close", onAction: toggleModal }}
                    secondaryActions={[{ content: "Export All Logs", onAction: exportLogsToCSV }]}
                >
                    <Modal.Section>
                        {selectedEntry.logs.length > 0 ? (
                            <>
                                <Text as="h3">Log Entries:</Text>
                                <br />
                                <IndexTable
                                    resourceName={{ singular: "log", plural: "logs" }}
                                    itemCount={selectedEntry.logs.length}
                                    headings={[
                                        { title: "SKU" },
                                        { title: "Stock" },
                                        { title: "Message" },
                                        { title: "Status" },
                                        { title: "Timestamp" },
                                    ]}
                                >
                                    {paginatedLogs.map((log) => (
                                        <IndexTable.Row id={log.id} key={log.id}>
                                            <IndexTable.Cell>{log.sku}</IndexTable.Cell>
                                            <IndexTable.Cell>{log.stock || "0"}</IndexTable.Cell>
                                            <IndexTable.Cell>{log.message}</IndexTable.Cell>
                                            <IndexTable.Cell>{log.status}</IndexTable.Cell>
                                            <IndexTable.Cell>{new Date(log.timestamp).toLocaleString()}</IndexTable.Cell>
                                        </IndexTable.Row>
                                    ))}
                                </IndexTable>

                                <Pagination
                                    hasPrevious={currentPage > 1}
                                    onPrevious={() => setCurrentPage(p => p - 1)}
                                    hasNext={currentPage * logsPerPage < selectedEntry.logs.length}
                                    onNext={() => setCurrentPage(p => p + 1)}
                                />
                            </>
                        ) : (
                            <Text>No logs found for this entry.</Text>
                        )}
                    </Modal.Section>
                </Modal>
            )}
        </Frame>
    );
}

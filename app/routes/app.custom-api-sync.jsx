import { useRef, useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { Page, Layout, Text, Card, Button, BlockStack, TextField, Modal, ProgressBar, Pagination, Box, Icon } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useOutletContext } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import db from "../db.server";
import { useSync } from "../context/SyncContext";

export const loader = async ({ request }) => {
  try {
    // Authenticate adminnp
    await authenticate.admin(request);
    // Fetch settings from the database
    const setting = await db.setting.findFirst();

    // Return the settings as JSON
    return json(setting);
  } catch (error) {
    console.error("Loader Error:", error);
    throw new Error("Failed to load setting.");
  }
};



// Query and Mutation to get and Post End
// let sessionTokenCache = null;

export default function Index() {

  const setting = useLoaderData();
  const { sessionToken } = useOutletContext();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  // const prisma = new PrismaClient();
  const [progress, setProgress] = useState(0); // Progress state
  const [apiProgress, setApiProgress] = useState(0); // API progress state
  const [syncSummary, setSyncSummary] = useState({
    successCount: 0,
    failureCount: 0,
    successItems: [],
    failureItems: [],
  });
  const [isSummaryPopupOpen, setIsSummaryPopupOpen] = useState(false);
  // const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [apiData, setApiData] = useState([]); // State for API data
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; //
  const totalPages = Math.ceil(apiData.length / itemsPerPage);
  const { setIsSyncing, isSyncing } = useSync();
  const [shouldStopSync, setShouldStopSync] = useState(false);
  const shouldStopSyncRef = useRef(false);
  const [elapsedTime, setElapsedTime] = useState(0); // Timer state
  // const [currentLogPage, setCurrentLogPage] = useState(1);
  // const logsPerPage = 20;
  // const totalLogPages = Math.ceil(combinedLogs.length / logsPerPage);
  const timerRef = useRef(null);
  // new code --- 

  console.log("session token Custom-APi", sessionToken)
  //Stock Sync from input

  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const [sessionId, setSessionId] = useState("");

  // For the logs

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("sessionId");  // ✅ Always remove old session on reload
      const newSessionId = generateSessionId();
      sessionStorage.setItem("sessionId", newSessionId);
      setSessionId(newSessionId);
      console.log("New sessionId generated:", newSessionId);
    }
  }, []);
  // For the logs


  // useEffect(() => {
  //   if (fetcher.state === "idle" && fetcher.data && sessionId) {
  //     console.log("Fetcher Data:", fetcher.data);
  //     const successItems = [];
  //     const failureItems = [];

  //     const { success, sku, stockQuantity, message, errors } = fetcher.data;

  //     if (success === true && sku && stockQuantity !== undefined) {
  //       setSyncSummary((prevState) => ({
  //         ...prevState,
  //         successCount: prevState.successCount + 1,
  //         successItems: [...prevState.successItems, { sku, stockQuantity, message }],
  //       }));

  //       successItems.push({
  //         sku,
  //         stock: stockQuantity,
  //         message: "Stock updated",
  //         status: "Success",
  //       });

  //       let logsToSave = [{ sku, stock: stockQuantity, message: "Stock updated", status: "Success" }];
  //       logsToSave = logsToSave.filter(log => log.sku && log.stock !== undefined);

  //       if (logsToSave.length > 0 && sessionId) { // ✅ Ensure sessionId is set
  //         fetcher.submit(
  //           {
  //             syncType: "Product Sync",
  //             sessionId: sessionId,
  //             sessionToken, // ✅ Use state sessionId
  //             logs: JSON.stringify(logsToSave)
  //           },
  //           {
  //             method: "POST", action: "/app/synclogsapi"
  //           }
  //         );
  //       }

  //       shopify.toast.show(`Stock adjusted successfully for SKU: ${sku}`);
  //     } else if (errors && Array.isArray(errors) && errors.length > 0) {
  //       const errorDetails = errors[0];
  //       const errorSku = errorDetails.field;

  //       if (errorSku) {
  //         setSyncSummary(prevState => ({
  //           ...prevState,
  //           failureCount: prevState.failureCount + 1,
  //           failureItems: [...prevState.failureItems, { sku: errorSku, message: errorDetails.message }],
  //         }));

  //         console.log("Failure:", fetcher.data.errors);
  //         failureItems.push({
  //           sku: errorSku,
  //           message: errorDetails.message,
  //           status: "Failed",
  //         });

  //         // shopify.toast.show(`SKU Not Found: ${errorSku}`);

  //         let logsToSave = [{ sku: errorSku, stock: stockQuantity ?? "N/A", message: errorDetails.message, status: "Failed" }];
  //         logsToSave = logsToSave.filter(log => log.sku && log.stock !== undefined);

  //         if (logsToSave.length > 0 && sessionId) {  // ✅ Ensure sessionId exists
  //           fetcher.submit(
  //             {
  //               syncType: "Product Sync",
  //               sessionId: sessionId,
  //               sessionToken,
  //               logs: JSON.stringify(logsToSave)
  //             },
  //             {
  //               method: "POST", action: "/app/synclogsapi"
  //             }
  //           );
  //         }
  //       }
  //     }
  //   }
  // }, [fetcher.state, fetcher.data, sessionId]);
  //  For the Response in popup and save logs history

  useEffect(() => {
    // startAutoSync();
    if (fetcher.data?.inventoryAdjustment) {

      fetchVendorData();
      // shopify.toast.show("Stock adjusted successfully");
    }
  },
    [fetcher.data?.inventoryAdjustment, shopify]);

  // Start the timer


  const startTimer = () => {
    if (timerRef.current) return; // prevent multiple intervals
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime((prevTime) => prevTime + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTimer(); // Clean on component unmount
  }, []);

  const fetchVendorData = async () => {
    stopTimer(); // Clear previous timer if still running
    setElapsedTime(0);
    startTimer(); // ✅ Start only once here

    setProgress(0);
    setApiData([]);
    setModalMessage("Fetching data...");
    setIsSummaryPopupOpen(true);
    setIsSyncing(true);
    setShouldStopSync(false);

    try {
      const settingsResponse = setting;

      if (!settingsResponse) {
        throw new Error("No settings data found.");
      }

      const { apiEndpoint, format, SKU, Stock } = settingsResponse;
      if (!apiEndpoint || !format || !SKU || !Stock) {
        shopify.toast.show("Please fill all the API fields in settings tab.");
        throw new Error("Settings data is incomplete.");
      }

      if (!["csv", "txt"].includes(format.toLowerCase())) {
        throw new Error("Unsupported format. Only CSV and TXT are supported.");
      }

      const apiUrl = `https://cors-proxy-test.rjdiazmiami.workers.dev/?api=${apiEndpoint}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: format.toLowerCase() === "csv" ? "text/csv" : "text/plain",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${apiUrl}`);
      }

      const rawData = await response.text();
      const rows = rawData.split("\n").map((row) => row.trim()).filter(Boolean);

      if (rows.length === 0) {
        throw new Error("No data found in the response.");
      }

      let delimiter = ",";
      if (rows[0].includes("|")) delimiter = "|";
      else if (rows[0].includes("\t")) delimiter = "\t";
      else if (rows[0].includes(" ")) delimiter = " ";

      const headers = rows[0].split(delimiter).map((h) => h.trim());
      if (!headers.includes(SKU) || !headers.includes(Stock)) {
        throw new Error("Invalid format: SKU or Stock column missing.");
      }

      const allApiData = rows.slice(1).map((row) => {
        const columns = row.split(delimiter).map((c) => c.trim());
        const sku = columns[headers.indexOf(SKU)];
        const stock = parseInt(columns[headers.indexOf(Stock)], 10);
        return sku && !isNaN(stock) ? { sku, stock } : null;
      }).filter(Boolean);

      setApiData(allApiData);
      await syncStockFromAPI(allApiData);

    } catch (error) {
      console.error("Error fetching API data:", error);
      setModalMessage("Failed to fetch API data.");
    } finally {
      stopTimer(); // ✅ Ensure timer is always stopped
      setTimeout(() => setIsProgressModalOpen(false), 100);
    }
  };

  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES = 1000; // 1 second

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const syncStockFromAPI = async (apiData) => {
    const totalProducts = apiData.length;
    let completedSyncs = 0;

    shouldStopSyncRef.current = false;
    setModalMessage("Syncing vendor data...");
    setApiProgress(0);
    setIsSyncing(true);

    const localSyncSummary = {
      successCount: 0,
      failureCount: 0,
      successItems: [],
      failureItems: [],
    };

    setSyncSummary({ ...localSyncSummary });

    const syncSingleProduct = async ({ sku, stock }) => {
      if (!sku || isNaN(stock)) return;

      try {
        const body = new URLSearchParams();
        body.append("sku", sku);
        body.append("stockQuantity", stock);
        body.append("sessionToken", sessionToken);

        const response = await fetch("/app/api-sync", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });

        const result = await response.json();
        if (result.success) {
          localSyncSummary.successCount++;
          localSyncSummary.successItems.push({ sku, stockQuantity: stock, message: result.message || "Stock updated" });
        } else {
          localSyncSummary.failureCount++;
          localSyncSummary.failureItems.push({ sku, message: result.errors?.[0]?.message || "Unknown error" });
        }

      } catch (err) {
        localSyncSummary.failureCount++;
        localSyncSummary.failureItems.push({ sku, message: err.message || "Sync failed" });
      }

      setSyncSummary({ ...localSyncSummary });
    };

    for (let i = 0; i < totalProducts; i += BATCH_SIZE) {
      if (shouldStopSyncRef.current) {
        console.log("Sync stopped by user.");
        shopify.toast.show("Sync stopped");
        break;
      }

      const currentBatch = apiData.slice(i, i + BATCH_SIZE);
      await Promise.all(currentBatch.map(syncSingleProduct));

      completedSyncs += currentBatch.length;
      setApiProgress((completedSyncs / totalProducts) * 100);

      if (i + BATCH_SIZE < totalProducts) {
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    const allLogs = [
      ...localSyncSummary.successItems.map(item => ({ sku: item.sku, stock: item.stockQuantity, message: item.message, status: "Success" })),
      ...localSyncSummary.failureItems.map(item => ({ sku: item.sku, stock: "N/A", message: item.message, status: "Failed" })),
    ];

    if (allLogs.length > 0 && sessionId) {
      const logsBody = new URLSearchParams();
      logsBody.append("syncType", "Vendor API Sync");
      logsBody.append("sessionId", sessionId);
      logsBody.append("sessionToken", sessionToken);
      logsBody.append("logs", JSON.stringify(allLogs));

      await fetch("/app/synclogsapi", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: logsBody,
      });
    }

    setIsSummaryPopupOpen(true);
    setIsSyncing(false);
  };


  // Timer reference


  // Format the elapsed time as HH:MM:SS
  const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };


  const PaginatedTable = ({ apiData }) => {
    const itemsPerPage = 10; // Number of items to show per page
    const [currentPage, setCurrentPage] = useState(1);

    const totalItems = apiData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Calculate the data for the current page
    const currentPageData = apiData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    const handlePrevious = () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    };

    const handleNext = () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    };
  }


  const paginatedData = apiData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };


  return (
    <Page>
      <TitleBar title="Stock Adjustment" />

      <BlockStack gap="500">
        {/* Update Stock by API Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <Card sectioned>
                <Text as="h2" variant="headingMd">
                  Update Stock by API
                </Text>
                <Text as="p" tone="subdued">
                  Fetch the latest vendor stock data and update your inventory in real-time.
                </Text>
                <br />
                <Text as="p" variant="bodySm" tone="subdued" >
                  Note : Dynamic API Sync does not work unitl you save the API details in settings page.
                </Text>
                <br />
                <Button onClick={fetchVendorData} >
                  Fetch Custom Vendor Data
                </Button> &nbsp;&nbsp;&nbsp;
                <Button onClick={() => setIsSummaryPopupOpen(true)}>View Sync Summary</Button>
              </Card>
            </Card>
          </Layout.Section>



          <Layout.Section>
            <Card title="Fetched API Data" sectioned>
              <Text as="h2" variant="headingMd">
                Response From API 🎉
              </Text>
              {paginatedData.length > 0 ? (
                <BlockStack>
                  {paginatedData.map((item, index) => (
                    <Text key={index}>{`SKU: ${item.sku}, Stock: ${item.stock}`}</Text>
                  ))}
                </BlockStack>
              ) : (
                <Text tone="subdued">No data fetched yet.</Text>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <Box paddingBlockStart="200">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} >
                      Previous
                    </Button>
                    <Text>{`Page ${currentPage} of ${totalPages}`}</Text>
                    <Button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} >
                      Next
                    </Button>
                  </div>
                </Box>
              )}
            </Card>
          </Layout.Section>

        </Layout>



        {/* Sync Summary Modal */}
        <Modal
          open={isSummaryPopupOpen}
          onClose={() => {
            setIsSummaryPopupOpen(false);
            setIsSyncing(false);
          }}
          title="Sync Summary"

          primaryAction={{
            content: "Stop Sync",
            onAction: () => {
              setIsSummaryPopupOpen(false);
              setIsSyncing(false);
              shouldStopSyncRef.current = true;
              // safest reload for now:
              // window.location.href = window.location.href;
            },
          }}

        >

          <Modal.Section>
            <ProgressBar progress={progress || apiProgress} />
            <br />
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                {formatTime(elapsedTime)}
              </Text> </BlockStack>
          </Modal.Section>
          <Modal.Section>
            <Text as="h3">Sync Results</Text>
            <Text>
              ✅ <strong>Successfully Updated:</strong> {syncSummary.successCount}
            </Text>
            <Text>
              ❌ <strong>Failed Updates:</strong> {syncSummary.failureCount}
            </Text>

            {/* ✅ Display Synced Products */}
            {syncSummary.successItems.length > 0 && (
              <>
                <br />
                <Text as="h4">Updated Products:</Text>
                <BlockStack>
                  {syncSummary.successItems.map((item, index) => (
                    <Text key={index}>{`📦 SKU: ${item.sku} → Stock: ${item.stockQuantity}`}</Text>
                  ))}
                </BlockStack>
              </>
            )}

            {/* ✅ Display Failed Products */}
            {syncSummary.failureItems.length > 0 && (
              <>
                <br />
                <Text as="h4" tone="critical">Failed Products:</Text>
                <BlockStack>
                  {syncSummary.failureItems.map((item, index) => (
                    <Text key={index}>{`❌ SKU: ${item.sku} - ${item.message}`}</Text>
                  ))}
                </BlockStack>
              </>
            )}
          </Modal.Section>

        </Modal>
      </BlockStack>
    </Page>
  );
}

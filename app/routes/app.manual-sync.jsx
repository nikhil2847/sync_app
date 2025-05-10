import { useRef, useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { Page, Layout, Text, Card, Button, BlockStack, TextField, Modal, ProgressBar } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "@remix-run/react";
import { useOutletContext } from "@remix-run/react";
import db from "../db.server";
import * as XLSX from 'xlsx'; // For Excel file handling
import { useSync } from "../context/SyncContext";
// import { saveAs } from 'file-saver';
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  try {
    let history = await db.history.findFirst();
    return json(history);
  } catch (error) {
    console.error("Loader Error:", error);

  }
  return json({ apiKey: "" });
};


// Query and Mutation to get and Post End

export default function Index() {
  const { sessionToken } = useOutletContext();
  const history = useLoaderData();
  const [formState, setFormState] = useState(history);
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [progress, setProgress] = useState(0); // Progress state
  const [apiProgress, setApiProgress] = useState(0); // API progress state
  const [stockQuantity, setStockQuantity] = useState(0);
  const [sku, setSku] = useState(""); // State for SKU input
  const { setIsSyncing, isSyncing } = useSync();
  const [shouldStopSync, setShouldStopSync] = useState(false);
  const shouldStopSyncRef = useRef(false);
  // const [file, setFile] = useState(null);
  const [syncSummary, setSyncSummary] = useState({
    successCount: 0,
    failureCount: 0,
    successItems: [],
    failureItems: [],
  });
  const [isSummaryPopupOpen, setIsSummaryPopupOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0); // Timer state
  const timerRef = useRef(null); // Timer reference
  const fetchersRef = useRef([]);
  const [syncResponses, setSyncResponses] = useState([]);

  // Start the timer
  const startTimer = () => {
    setElapsedTime(0); // Reset the timer
    timerRef.current = setInterval(() => {
      setElapsedTime((prevTime) => prevTime + 1);
    }, 1000); // Increment every second
  };

  // Stop the timer
  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // Format the elapsed time as HH:MM:SS
  const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };




  // console.log("sessionToken---in additional jsx ", sessionToken)


  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("sessionId");  // ✅ Always remove old session on reload
      const newSessionId = generateSessionId();
      sessionStorage.setItem("sessionId", newSessionId);
      setSessionId(newSessionId);
      console.log("New sessionId generated:", newSessionId);
    }
  }, []);


  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && sessionId) {
      console.log("Fetcher Data:", fetcher.data);
      const successItems = [];
      const failureItems = [];

      const { success, sku, stockQuantity, message, errors } = fetcher.data;

      if (success === true && sku && stockQuantity !== undefined) {
        setSyncSummary((prevState) => ({
          ...prevState,
          successCount: prevState.successCount + 1,
          successItems: [...prevState.successItems, { sku, stockQuantity, message }],
        }));

        successItems.push({
          sku,
          stock: stockQuantity,
          message: "Stock updated",
          status: "Success",
        });

        let logsToSave = [{ sku, stock: stockQuantity, message: "Stock updated", status: "Success" }];
        logsToSave = logsToSave.filter(log => log.sku && log.stock !== undefined);

        if (logsToSave.length > 0 && sessionId) { // ✅ Ensure sessionId is set
          fetcher.submit(
            {
              syncType: "Product Sync",
              sessionId: sessionId,
              sessionToken, // ✅ Use state sessionId
              logs: JSON.stringify(logsToSave)
            },
            {
              method: "POST", action: "/app/synclogsapi"

            }
          );
        }

        // shopify.toast.show(`Stock adjusted successfully for SKU: ${sku}`);
        setIsSummaryPopupOpen(true);

      } else if (errors && Array.isArray(errors) && errors.length > 0) {
        const errorDetails = errors[0];
        const errorSku = errorDetails.field;

        if (errorSku) {
          setSyncSummary(prevState => ({
            ...prevState,
            failureCount: prevState.failureCount + 1,
            failureItems: [...prevState.failureItems, { sku: errorSku, message: errorDetails.message }],
          }));

          console.log("Failure:", fetcher.data.errors);
          failureItems.push({
            sku: errorSku,
            message: errorDetails.message,
            status: "Failed",
          });

          // shopify.toast.show(`Error adjusting stock for SKU: ${errorSku}`);
          setIsSummaryPopupOpen(true);

          let logsToSave = [{ sku: errorSku, stock: stockQuantity ?? "N/A", message: errorDetails.message, status: "Failed" }];
          logsToSave = logsToSave.filter(log => log.sku && log.stock !== undefined);

          if (logsToSave.length > 0 && sessionId) {  // ✅ Ensure sessionId exists
            fetcher.submit(
              {
                syncType: "Product Sync",
                sessionId: sessionId,
                sessionToken,
                logs: JSON.stringify(logsToSave)
              },
              {
                method: "POST", action: "/app/synclogsapi"
              }
            );
          }
        }
      }
    }
  }, [fetcher.state, fetcher.data, sessionId]); // ✅ Added sessionId as a dependency



  const adjustStock = async () => {
    startTimer(); // Start the timer
    setIsSyncing(true); // Indicate syncing is in progress

    try {
      fetcher.submit(
        { stockQuantity, sku, sessionToken }, // Submit both stock quantity and SKU
        {
          method: "POST",
          action: "/app/api-sync",
        }
      );

      console.log("Fetcher-data:", fetcher.data);

      if (fetcher.data?.success) {
        setIsSummaryPopupOpen(true);
        console.log("Stock adjusted successfully");
      } else if (fetcher.data?.errors) {
        setIsSummaryPopupOpen(true);
        console.log("Error adjusting stock.");
      }
    } catch (error) {
      console.error("Error during stock adjustment:", error);
    } finally {
      stopTimer(); // Stop the timer
      setIsSyncing(false); // Indicate syncing is complete
    }
  };



  //Stock Sync from input End

  //Stock Sync from File Upload 

  const handleFileUpload = (event) => {
    setModalMessage("Processing CSV file...");
    setIsSummaryPopupOpen(true);
    const selectedFile = event.target.files[0]; // Get the first file

    if (!selectedFile) {
      alert("No file selected. Please select a CSV or Excel file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      console.log("Parsed Data:", jsonData);
      processCSVData(jsonData);

    };

    reader.readAsArrayBuffer(selectedFile);
  };


  //Stock Sync from File Upload End

  //Sync data Api code Work Start
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES = 1000; // 1 second

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const processCSVData = async (data) => {
    const validHeaders = ["SKU", "Stock"];
    const totalRows = data.length;
    setProgress(0);
    setIsSyncing(true);
    shouldStopSyncRef.current = false;
    startTimer();

    // Local accumulator for full logs
    const localSyncSummary = {
      successCount: 0,
      failureCount: 0,
      successItems: [],
      failureItems: []
    };

    // Reset visible summary
    setSyncSummary({
      successCount: 0,
      failureCount: 0,
      successItems: [],
      failureItems: []
    });

    try {
      if (!data.every((row) => Object.keys(row).every((key) => validHeaders.includes(key)))) {
        shopify.toast.show("File must contain 'SKU' and 'Stock' columns.");
        return;
      }

      for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        if (shouldStopSyncRef.current) {
          shopify.toast.show("Sync stopped");
          break;
        }

        const batch = data.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (row) => {
          const sku = row.SKU;
          const stockQuantity = Number(row.Stock);

          if (!sku || isNaN(stockQuantity)) return;

          try {
            const body = new URLSearchParams();
            body.append("sku", sku);
            body.append("stockQuantity", stockQuantity);
            body.append("sessionToken", sessionToken);

            const response = await fetch("/app/api-sync", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body
            });

            const result = await response.json();
            setSyncResponses(prev => [...prev, { sku, stockQuantity, result }]);
            console.log(`✅ Synced SKU: ${sku}`, result);

            if (result.success) {
              localSyncSummary.successCount += 1;
              localSyncSummary.successItems.push({ sku, stockQuantity, message: result.message || "Stock updated" });

              // Update real-time popup
              setSyncSummary(prev => ({
                ...prev,
                successCount: prev.successCount + 1,
                successItems: [...prev.successItems, { sku, stockQuantity, message: result.message || "Stock updated" }]
              }));
            } else if (result.errors?.length) {
              const errorDetails = result.errors[0];
              const errorSku = errorDetails?.field || sku;

              localSyncSummary.failureCount += 1;
              localSyncSummary.failureItems.push({ sku: errorSku, message: errorDetails.message });

              setSyncSummary(prev => ({
                ...prev,
                failureCount: prev.failureCount + 1,
                failureItems: [...prev.failureItems, { sku: errorSku, message: errorDetails.message }]
              }));
            }

          } catch (err) {
            console.error(`❌ Error syncing SKU: ${sku}`, err);

            localSyncSummary.failureCount += 1;
            localSyncSummary.failureItems.push({ sku, message: err.message || "Sync failed" });

            setSyncSummary(prev => ({
              ...prev,
              failureCount: prev.failureCount + 1,
              failureItems: [...prev.failureItems, { sku, message: err.message || "Sync failed" }]
            }));
          }
        }));

        const progressPercentage = ((i + BATCH_SIZE) / totalRows) * 100;
        setProgress(Math.min(progressPercentage, 100));
        await delay(DELAY_BETWEEN_BATCHES);
      }

      // Save all logs from the local accumulator
      const allLogs = [
        ...localSyncSummary.successItems.map(item => ({
          sku: item.sku,
          stock: item.stockQuantity,
          message: item.message,
          status: "Success"
        })),
        ...localSyncSummary.failureItems.map(item => ({
          sku: item.sku,
          stock: "N/A",
          message: item.message,
          status: "Failed"
        }))
      ];

      if (allLogs.length > 0 && sessionId) {
        const logsBody = new URLSearchParams();
        logsBody.append("syncType", "Product Sync");
        logsBody.append("sessionId", sessionId);
        logsBody.append("sessionToken", sessionToken);
        logsBody.append("logs", JSON.stringify(allLogs));

        await fetch("/app/synclogsapi", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: logsBody
        });
      }

      setIsSummaryPopupOpen(true); // Final popup confirmation

    } catch (error) {
      console.error("Error processing data:", error);
    } finally {
      stopTimer();
      setIsSyncing(false);
    }
  };


  // Convert XML to JSON (unchanged)
  const xmlToJson = (xml) => {
    const obj = {};

    // Check if the node is an element
    if (xml.nodeType === 1) { // Element node
      if (xml.attributes.length > 0) {
        obj["@attributes"] = {};
        for (let j = 0; j < xml.attributes.length; j++) {
          const attribute = xml.attributes.item(j);
          obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
        }
      }
    }
    // Handle text nodes
    else if (xml.nodeType === 3) { // Text node
      return xml.nodeValue.trim();
    }

    // Recursively process child nodes
    if (xml.hasChildNodes()) {
      for (let i = 0; i < xml.childNodes.length; i++) {
        const item = xml.childNodes.item(i);
        const nodeName = item.nodeName;

        if (typeof obj[nodeName] === "undefined") {
          obj[nodeName] = xmlToJson(item);
        } else {
          if (typeof obj[nodeName].push === "undefined") {
            const old = obj[nodeName];
            obj[nodeName] = [];
            obj[nodeName].push(old);
          }
          obj[nodeName].push(xmlToJson(item));
        }
      }
    }

    return obj;
  };


  //Sync data Api code Work End


  const handleDownloadDemoCSV = () => {
    const csvContent = `SKU,Stock\nABC123,10\nXYZ789,20`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Option 1: Use native anchor
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "demo-stock-upload.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Option 2 (if using file-saver): saveAs(blob, 'demo-stock-upload.csv');
  };

  return (
    <Page>
      <TitleBar title="Stock Adjustment" />

      <BlockStack gap="500">
        <Layout>
          {/* ✅ Single SKU Stock Update Section */}
          <Layout.Section>
            <Card gap="500">
              <BlockStack gap="200">
                <Text as="h1" variant="headingMd">
                  Update Stock by Single SKU
                </Text>
                <Text as="p" variant="bodySm" tone="subdued" >
                  Quickly update stock for a specific product by entering the SKU and the new stock quantity.
                </Text>

              </BlockStack>
              <br />
              <BlockStack gap="500">
                <TextField
                  label="Product SKU"
                  value={sku}
                  placeholder="Enter SKU (e.g., ABC123)"
                  onChange={(value) => setSku(value)}
                />
                <TextField
                  label="Stock Quantity"
                  value={stockQuantity}
                  placeholder="Enter stock amount"
                  onChange={(value) => setStockQuantity(value)}
                  type="number"
                />
                <Button variant="primary" onClick={adjustStock}>
                  Adjust Stock
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ✅ Bulk Stock Update Section */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card sectioned>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Update Stock via CSV or XML
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" >
                    Upload a file to update stock in bulk. Ensure the file contains valid SKU and Stock values.
                  </Text>

                  <input
                    type="file"
                    accept=".csv, .xlsx"
                    onChange={handleFileUpload}
                    disabled={isSyncing}
                  />
                  {/* </BlockStack>
                  <BlockStack gap="200"> */}
                  <Text as="p" variant="bodySm" tone="subdued">
                    Supported formats: .CSV, .XLSX
                  </Text>
                  <Button onClick={handleDownloadDemoCSV}>Download File Format</Button>
                </BlockStack>
              </Card>

              {/* ✅ Buttons for Progress & Summary */}
              {/* <Button onClick={() => setIsProgressModalOpen(true)}>Check Upload Progress</Button> */}
              <Button onClick={() => setIsSummaryPopupOpen(true)}>View Sync Summary</Button>
            </BlockStack>
          </Layout.Section>
        </Layout>



        {/* ✅ Sync Summary Modal */}
        <Modal
          open={isSummaryPopupOpen}
          onClose={() => {
            setIsSummaryPopupOpen(false);
            setIsSyncing(false);
          }}

          title="Stock Sync Summary"
          primaryAction={{
            content: "Stop Sync",
            onAction: () => {

              setIsSummaryPopupOpen(false);
              setIsSyncing(false);
              shouldStopSyncRef.current = true; // 🔥 This now immediately updates
              // shopify.toast.show("Sync has been stopped.");

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

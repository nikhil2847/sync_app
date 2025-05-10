import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError, useNavigation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";
import createApp from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge-utils";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import NProgress from "nprogress";
import { SyncProvider, useSync } from "../context/SyncContext";
import "nprogress/nprogress.css";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  try {
    await authenticate.admin(request);
    return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
  } catch (error) {
    console.error("Authentication failed in loader", error);
    // Instead of throwing error, return safe fallback
    return json({ apiKey: "" });
  }
};


export default function App() {
  const { apiKey } = useLoaderData();
  const transition = useNavigation();
  const [sessionToken, setSessionToken] = useState("");
  const [host, setHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const hostParam = urlParams.get("host");

      if (!hostParam) {
        console.error("Host parameter is missing in the URL.");
        return;
      }

      setHost(hostParam);

      const app = createApp({
        apiKey,
        host: hostParam,
        forceRedirect: true,
      });

      const fetchSessionToken = async () => {
        try {
          const token = await getSessionToken(app);
          setSessionToken(token);
          localStorage.setItem("sessionToken", token);
        } catch (error) {
          console.error("Error fetching session token:", error);
        }
      };

      fetchSessionToken();
      const interval = setInterval(fetchSessionToken, 50000);

      return () => clearInterval(interval);
    }
  }, [apiKey]);

  useEffect(() => {
    const controller = new AbortController();
    if (transition.state === "loading") {
      NProgress.start();
      controller.abort();
    } else {
      NProgress.done();
    }
    return () => controller.abort();
  }, [transition.state]);

  return (
    <SyncProvider>
      <AppProvider isEmbeddedApp apiKey={apiKey} host={host} token={sessionToken}>
        <NavMenu>
          <InnerNavigation />
        </NavMenu>
        <Outlet context={{ sessionToken }} />
      </AppProvider>
    </SyncProvider>
  );
}

function InnerNavigation() {
  const { isSyncing } = useSync(); // ✅ Safe
  const handleClick = (e) => {
    if (isSyncing) {
      e.preventDefault(); // ❌ Block navigation
    }
  };
  const linkStyles = (disabled) => ({
    pointerEvents: disabled ? "none" : "auto",
    opacity: disabled ? 0.5 : 1,
    textDecoration: disabled ? "none" : "underline",
    color: disabled ? "#999" : "#0055cc",
    transition: "opacity 0.3s",
  });

  return (
    <>
      <Link to="/app" rel="home" onClick={handleClick} style={{ opacity: isSyncing ? 0.1 : 1 }}>Dashboard</Link>
      <Link to="/app/manual-sync" onClick={handleClick} style={{ opacity: isSyncing ? 0.1 : 1 }}>Manual Sync</Link>
      <Link to="/app/custom-api-sync" onClick={handleClick} style={{ opacity: isSyncing ? 0.1 : 1 }}>Dynamic Sync</Link>
      <Link to="/app/sync-logs" onClick={handleClick} style={{ opacity: isSyncing ? 0.1 : 1 }}>Sync Logs</Link>
      <Link to="/app/settings" onClick={handleClick} style={{ opacity: isSyncing ? 0.1 : 1 }}>Settings</Link>
      <Link to="/app/TawkTo" onClick={handleClick} style={{ opacity: isSyncing ? 0.1 : 1 }}>Support</Link>
    </>

  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

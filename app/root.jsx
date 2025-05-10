import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { authenticate } from "./shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};


export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        {/* ✅ Correct App Bridge script */}
        <script src="https://unpkg.com/@shopify/app-bridge@3"></script>

        <Meta />
        <Links />


      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />


      </body>



    </html>
  );
}

import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
// import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const { login } = await import("../../shopify.server"); // 👈 Import inside server function
  return login(request);
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (shop) {
    console.log("✅ Redirecting with shop param:", shop);
    return redirect(`/app?${url.searchParams.toString()}`);
  } else {
    console.warn("⚠️ Missing shop param in / route loader");
  }

  // Just show the login form if shop is not present
  return json({ showForm: true });
  };


export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>A short heading about [your app]</h1>
        <p className={styles.text}>
          A tagline about [your app] that describes your value proposition.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li>
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li>
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
        </ul>
      </div>
    </div>
  );
}

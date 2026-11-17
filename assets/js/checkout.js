/**
 * Checkout adapter. This is the only file to change when payments go live.
 *
 * Today the store is pre-launch. `beginCheckout` returns `{ mode: "prelaunch" }`
 * and the checkout page asks for an email instead of taking payment.
 *
 * Shopify Buy Button or Storefront API, later:
 *   1. Read `product.commerce.shopifyProductId` and
 *      `product.commerce.shopifyVariantIds[size]` from data/products.json.
 *   2. Create a checkout with the Storefront API (or open a Buy Button cart)
 *      from the lines in `cart`.
 *   3. Return `{ mode: "redirect", url: checkoutWebUrl }`.
 *   The cart drawer and /checkout/ already follow that redirect.
 *
 * Stripe Payment Links, later:
 *   A single-line bag can redirect to `product.commerce.stripePaymentLink`
 *   when that field is filled in. Payment Links are per product. A mixed bag
 *   needs Checkout Sessions, which needs a small server. This site is static,
 *   so do that only when you are ready to add one.
 *
 * Do not import a paid SDK here until the owner approves a provider.
 */

export async function beginCheckout(cart) {
  if (!cart || !Array.isArray(cart.lines)) {
    return { mode: "prelaunch" };
  }
  return { mode: "prelaunch" };
}

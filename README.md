# Seventh Day Golf

Static storefront for [seventhdaygolf.com](https://seventhdaygolf.com). GitHub Pages serves the files in this repo as-is. `CNAME` and `.nojekyll` stay at the root.

Tagline: On the seventh day, there was golf.

## Run it locally

From the repo root:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/`. Clean URLs are folders with `index.html` (`/shop/`, `/products/walk-on-water-tee/`), which is what GitHub Pages expects. Do not open the HTML files directly from disk. Root-absolute paths need a server.

After editing products, prices, or copy:

```bash
node scripts/build.mjs
```

Commit the generated HTML and images with the data files. Pages does not run the build.

## Placeholder prices

Nothing is final until samples are approved. Every number lives in `data/config.json` under `prices`:

| Piece | Placeholder |
| --- | --- |
| Oversized tees | $45 (2XS–XL), $52 (2XL–6XL) |
| Athletic shorts | $58 (2XS–XL), $68 (2XL–6XL) |
| Rope cap | $34 |
| Bucket hat | $34 |
| Dad hat | $32 |
| Cuffed beanie | $30 |
| Golf towel | $25 |

Products point at a `priceKey` and do not repeat those amounts. Change the config, rebuild, and the cards, product pages, and size guide update together.

### Size-specific overrides

`assets/js/pricing.js` resolves a size like this:

1. `product.sizePrices[size]` if that size is set on the product
2. else `config.prices[priceKey].sizePrices[size]`
3. else `product.price` if it is a number
4. else `config.prices[priceKey].amount`

Leave `price` as `null` and `sizePrices` as `{}` to use the config only. To charge a different 6XL on one tee:

```json
"price": null,
"sizePrices": { "6XL": 60 }
```

## Products and photos

`data/products.json` is the catalog. Each product has `id`, `name`, `slug`, `collection`, `priceKey`, `price`, `sizePrices`, `sizes`, `colors`, `images`, `description`, and `commerce`.

Image files live at:

```
images/products/<slug>/front.webp
images/products/<slug>/back.webp
images/products/<slug>/front-angle.webp
images/products/<slug>/back-angle.webp
images/products/<slug>/model-1.webp
```

`data/sources.json` maps those files to the original PNGs in `sdg-mockups/`. When a PNG is there, `scripts/images.py` (run by the build) resizes it to WebP (longest edge 1600) and clears `"placeholder": false`. If the PNG is missing, the script draws a labeled stand-in the first time, and the page says the studio photo is on the way.

To swap a photo in without the build, replace the WebP at the same path and set `"placeholder": false` on that image in `data/products.json`. The card uses the first real front shot, and hovers to the back when one exists.

Pieces still waiting on a full studio set: the Jesus Is My Caddie tee front, the beanie’s main shots (a seasonal photo can fill `model-1.webp`), the dad hat, the athletic shorts, the towel, the white script tee, the Glory of God tee, and the Cross Sunset tee.

## Checkout, later

The bag is `localStorage` only (`sdg.cart.v1`). No Shopify, no Stripe, no monthly fee.

Checkout is pre-launch. `/checkout/` says the drop is coming and asks for an email. The form opens a `mailto:` to `notifyEmail` in `data/config.json` (currently `hello@seventhdaygolf.com`). Change that address before you rely on it. The address is also saved on the device so the note is not lost if the mail app does not open. Nothing is charged.

`assets/js/checkout.js` is the only file to change when payments go live. `beginCheckout(cart)` returns `{ mode: "prelaunch" }` today. The cart drawer and the checkout page already follow `{ mode: "redirect", url }` if you return one.

- Shopify Buy Button or Storefront API: read `commerce.shopifyProductId` and `commerce.shopifyVariantIds` (keyed by size) from `data/products.json`, create the checkout, and return the web URL.
- Stripe Payment Links: a one-line bag can redirect to `commerce.stripePaymentLink`. A mixed bag needs Checkout Sessions and a server, which this static site does not have.

Those commerce fields are empty strings and an empty object on purpose.

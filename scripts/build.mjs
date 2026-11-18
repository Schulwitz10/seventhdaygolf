import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { priceLabel, upchargeNote, resolvedPrices, formatMoney } from "../assets/js/pricing.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const images = spawnSync("python3", ["scripts/images.py"], { cwd: root, stdio: "inherit" });
if (images.status !== 0) process.exit(images.status ?? 1);

const config = JSON.parse(readFileSync(join(root, "data/config.json"), "utf8"));
const { products } = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));
const meta = JSON.parse(readFileSync(join(root, "data/image-meta.json"), "utf8"));
products.sort((a, b) => a.sort - b.sort);

const NAV = [
  ["/shop/", "Shop"],
  ["/collections/new-arrivals/", "New"],
  ["/collections/tees/", "Tees"],
  ["/collections/headwear/", "Headwear"],
  ["/collections/shorts/", "Shorts"],
  ["/collections/accessories/", "Accessories"],
  ["/about/", "About"]
];

const COLLECTIONS = [
  { slug: "tees", name: "Tees", tile: "tile-tees", blurb: "Oversized graphic tees. A line of scripture, a little humor, and the mark on the cloth.", filter: (p) => p.collection === "tees" },
  { slug: "headwear", name: "Headwear", tile: "tile-headwear", blurb: "Rope caps, bucket hats, a dad hat, and a cuffed beanie.", filter: (p) => p.collection === "headwear" },
  { slug: "shorts", name: "Shorts", tile: "tile-shorts", blurb: "Black athletic shorts, cut to move, from 2XS through 6XL.", filter: (p) => p.collection === "shorts" },
  { slug: "accessories", name: "Accessories", tile: "tile-accessories", blurb: "What goes in the bag. Starting with the golf towel.", filter: (p) => p.collection === "accessories" },
  { slug: "new-arrivals", name: "New Arrivals", tile: "tile-tees", blurb: "The first drop. Samples are in review, and checkout opens when they are approved.", filter: (p) => p.newArrival }
];

const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const dims = (src) => meta[src] || { width: 1200, height: 1500 };

function pickImages(product) {
  const usable = (image) => image && !image.placeholder && !image.seasonal;
  const primary = product.images.find((image) => image.primary)
    || product.images.find((image) => usable(image) && (image.view === "front" || image.view === "front-angle"))
    || product.images.find((image) => usable(image))
    || product.images[0];
  const others = product.images.filter((image) => image.src !== primary.src && usable(image));
  const leadIsBack = primary.view === "back" || primary.view === "back-angle";
  const secondary = (leadIsBack
    ? others.find((image) => image.view === "front" || image.view === "front-angle")
    : others.find((image) => image.view === "back" || image.view === "back-angle"))
    || others[0]
    || product.images.find((image) => image.src !== primary.src && !image.placeholder)
    || null;
  return { primary, secondary };
}

function badge(product) {
  if (pickImages(product).primary.placeholder) return "Photo soon";
  if (product.featured) return "Featured";
  return "New";
}

function card(product, eager = false) {
  const { primary, secondary } = pickImages(product);
  const d = dims(primary.src);
  const alt = secondary ? dims(secondary.src) : null;
  return `<article class="card">
    <a class="card-media" href="/products/${product.slug}/">
      <img class="card-img" src="/${primary.src}" alt="${esc(primary.alt)}" width="${d.width}" height="${d.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>
      ${secondary ? `<img class="card-img card-img-alt" src="/${secondary.src}" alt="" width="${alt.width}" height="${alt.height}" loading="lazy">` : ""}
      <span class="card-badge">${esc(badge(product))}</span>
    </a>
    <div class="card-info">
      <h3><a href="/products/${product.slug}/">${esc(product.name)}</a></h3>
      <p class="card-price">${esc(priceLabel(product, config))}</p>
    </div>
  </article>`;
}

function grid(list) {
  return `<div class="product-grid">${list.map((product, i) => card(product, i < 2)).join("")}</div>`;
}

const bagIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 8h11l-.8 12H7.3L6.5 8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/></svg>`;

function layout({ title, description, path, body, newsletter = true }) {
  const fullTitle = path === "/" ? `${config.brand} — ${config.tagline}` : `${title} — ${config.brand}`;
  const links = (extra = "") => NAV.map(([href, label]) => {
    const current = path === href || (href !== "/shop/" && path.startsWith(href)) ? ' aria-current="page"' : "";
    return `<a href="${href}"${current}${extra}>${label}</a>`;
  }).join("");
  const track = config.announcements.map((item) => `<span>${esc(item)}</span>`).join('<span aria-hidden="true">·</span>');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${config.domain}${path}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${config.domain}${path}">
<meta name="theme-color" content="#12291c">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body data-notify-email="${esc(config.notifyEmail)}">
<a class="skip" href="#main">Skip to content</a>
<div class="announce" aria-hidden="true"><div class="announce-track">${track}${track}</div></div>
<header class="header">
  <div class="header-inner">
    <button class="menu-btn" id="menuBtn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="navMobile"><span></span></button>
    <a class="logo" href="/"><img src="/assets/img/logo-green.png" alt="Seventh Day Golf" width="1400" height="346"></a>
    <nav class="nav-desktop" aria-label="Primary">${links()}</nav>
    <button class="icon-btn" id="cartOpen" type="button" aria-label="Open bag">${bagIcon}<span class="cart-count" id="cartCount" hidden>0</span></button>
  </div>
  <nav class="nav-mobile" id="navMobile" hidden>${links()}</nav>
</header>
<main id="main">${body}</main>
${newsletter ? `<section class="newsletter"><div class="wrap">
  <h2>Get the drop date.</h2>
  <p>Leave your email and your mail app will open a note to us. Send it, and you are on the list for the drop.</p>
  <form class="signup" id="newsletterForm">
    <input type="email" name="email" required autocomplete="email" placeholder="Email address" aria-label="Email address">
    <button class="btn btn-dark" type="submit">Notify me</button>
  </form>
  <p class="form-msg" id="newsletterMsg" role="status"></p>
</div></section>` : ""}
<footer class="footer">
  <div class="wrap footer-grid">
    <div>
      <a class="logo" href="/"><img src="/assets/img/logo-cream.png" alt="Seventh Day Golf" width="1400" height="346"></a>
      <p class="f-tag">${esc(config.tagline)}</p>
      <p class="f-note">Christian golf apparel, founded in 2026. Checkout is closed until the samples are approved. Prices on the site are placeholders.</p>
    </div>
    <div>
      <h3>Shop</h3>
      <a href="/collections/new-arrivals/">New arrivals</a>
      <a href="/collections/tees/">Tees</a>
      <a href="/collections/headwear/">Headwear</a>
      <a href="/collections/shorts/">Shorts</a>
      <a href="/collections/accessories/">Accessories</a>
      <a href="/shop/">Shop all</a>
    </div>
    <div>
      <h3>Help</h3>
      <a href="/size-guide/">Size guide</a>
      <a href="/faq/">Shipping &amp; FAQ</a>
      <a href="/contact/">Contact</a>
      <a href="/checkout/">Bag &amp; checkout</a>
    </div>
    <div>
      <h3>Visit</h3>
      <a href="/about/">About</a>
      <a href="mailto:${esc(config.notifyEmail)}">${esc(config.notifyEmail)}</a>
    </div>
  </div>
  <div class="wrap legal"><span>© 2026 Seventh Day Golf</span><span>seventhdaygolf.com</span></div>
</footer>
<div class="cart-drawer" id="cartDrawer" hidden>
  <button class="cart-backdrop" type="button" data-cart-close aria-label="Close bag"></button>
  <div class="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
    <div class="cart-head">
      <h2 id="cartTitle">Your bag</h2>
      <button class="icon-btn" id="cartClose" type="button" data-cart-close aria-label="Close bag">×</button>
    </div>
    <div class="cart-items" id="cartItems"></div>
    <div class="cart-foot">
      <p class="cart-sub"><span>Subtotal</span><strong id="cartSubtotal">$0</strong></p>
      <p class="cart-note">${esc(config.priceNote)} Nothing is charged today.</p>
      <a class="btn btn-dark btn-block" id="cartCheckout" href="/checkout/">Checkout</a>
    </div>
  </div>
</div>
<script type="module" src="/assets/js/site.js"></script>
</body>
</html>
`;
}

function write(path, html) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

function hero() {
  const heroProduct = products.find((product) => product.hero);
  const photo = heroProduct.images.find((image) => image.view === "model" && !image.placeholder && !image.seasonal)
    || pickImages(heroProduct).primary;
  const usable = photo && !photo.placeholder ? photo : null;
  const d = usable ? dims(usable.src) : null;
  return `<section class="hero${usable ? " hero-photo" : ""}">
    ${usable ? `<img class="hero-bg" src="/${usable.src}" alt="${esc(usable.alt)}" width="${d.width}" height="${d.height}" fetchpriority="high">` : `<div class="hero-mark" aria-hidden="true">7</div>`}
    ${usable ? `<div class="hero-shade"></div>` : ""}
    <div class="hero-inner">
      <p class="eyebrow">Est. 2026 · Christian golf apparel</p>
      <h1 class="display">On the seventh day,<br>there was golf.</h1>
      <p class="hero-lead">Oversized tees, rope caps, and the rest of the bag. Made for the round, and for the rest of the week. The first drop is in samples. Nothing is for sale until we say so.</p>
      <div class="hero-actions">
        <a class="btn btn-cream" href="/collections/new-arrivals/">Shop the drop</a>
        <a class="btn btn-ghost" href="/products/${heroProduct.slug}/">Shop the rope cap</a>
      </div>
    </div>
    <nav class="hero-links" aria-label="Collections">
      ${COLLECTIONS.filter((c) => c.slug !== "new-arrivals").map((c) => `<a href="/collections/${c.slug}/">${c.name}</a>`).join("")}
    </nav>
  </section>`;
}

function lifestyle() {
  const shorts = products.find((product) => product.slug === "black-athletic-shorts");
  const shot = shorts?.images.find((image) => image.lifestyle && !image.placeholder);
  if (!shot) return "";
  const d = dims(shot.src);
  return `<section class="lifestyle">
    <img src="/${shot.src}" alt="${esc(shot.alt)}" width="${d.width}" height="${d.height}" loading="lazy">
    <div class="lifestyle-copy wrap">
      <p class="eyebrow">Worn on the course</p>
      <h2 class="display">Black Athletic Shorts</h2>
      <p><a class="btn btn-cream" href="/products/${shorts.slug}/">Shop the shorts</a></p>
    </div>
  </section>`;
}

function home() {
  const feature = products.find((product) => product.slug === "walk-on-water-tee");
  const shot = feature.images.find((image) => image.view === "back" && !image.placeholder) || pickImages(feature).primary;
  const d = dims(shot.src);
  const body = `
    ${hero()}
    <section class="section"><div class="wrap">
      <div class="sec-head"><h2>Shop by collection</h2></div>
      <div class="tile-grid">
        ${COLLECTIONS.filter((c) => c.slug !== "new-arrivals").map((c) => `<a class="tile ${c.tile}" href="/collections/${c.slug}/"><small>Shop</small><span>${c.name}</span></a>`).join("")}
      </div>
    </div></section>
    <section class="section" style="padding-top:0"><div class="wrap">
      <div class="sec-head"><h2>New arrivals</h2><a class="sec-link" href="/collections/new-arrivals/">Shop all new</a></div>
      ${grid(products.filter((p) => p.newArrival).slice(0, 8))}
    </div></section>
    ${lifestyle()}
    <section class="feature">
      <img src="/${shot.src}" alt="${esc(shot.alt)}" width="${d.width}" height="${d.height}" loading="lazy">
      <div class="feature-copy">
        <p class="eyebrow">${feature.verse ? esc(feature.verse) : "Featured"}</p>
        <h2 class="display">${esc(feature.name)}</h2>
        <p>${esc(feature.description)}</p>
        <p>${esc(priceLabel(feature, config))}</p>
        <p><a class="btn btn-cream" href="/products/${feature.slug}/">Shop the tee</a></p>
      </div>
    </section>
    <section class="quote">
      <blockquote>“Whatever you do, do it all for the glory of God.”<cite>1 Corinthians 10:31</cite></blockquote>
    </section>`;
  write("index.html", layout({
    title: config.brand,
    description: "Seventh Day Golf. Christian golf apparel. On the seventh day, there was golf. Oversized tees, headwear, shorts, and a towel. Pre-launch.",
    path: "/",
    body
  }));
}

function catalog({ title, description, path, blurb, list }) {
  const filters = [{ href: "/shop/", label: "All" }, ...COLLECTIONS.map((c) => ({ href: `/collections/${c.slug}/`, label: c.name }))];
  const body = `<div class="wrap page-head">
      <h1 class="display">${esc(title)}</h1>
      <p>${esc(blurb)}</p>
    </div>
    <div class="wrap">
      <nav class="filters" aria-label="Collections">${filters.map((f) => `<a href="${f.href}"${f.href === path ? ' aria-current="page"' : ""}>${f.label}</a>`).join("")}</nav>
      ${grid(list)}
      <p class="fine" style="margin:1.4rem 0 2rem">${list.length} ${list.length === 1 ? "piece" : "pieces"} · ${esc(config.priceNote)}</p>
    </div>`;
  write(path.replace(/^\//, "").replace(/\/$/, "") + "/index.html", layout({ title, description, path, body }));
}

function productPage(product) {
  const start = pickImages(product).primary;
  const prices = resolvedPrices(product, config);
  const note = upchargeNote(product, config);
  const single = product.sizes.length === 1;
  const shownPrice = single ? formatMoney(prices[product.sizes[0]]) : priceLabel(product, config);
  const collection = COLLECTIONS.find((c) => c.slug === product.collection);
  const anyPlaceholder = product.images.some((image) => image.placeholder);
  const data = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    color: product.colors[0].name,
    sizes: product.sizes,
    prices,
    image: pickImages(product).primary.src,
    imageAlt: pickImages(product).primary.alt
  };
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: config.brand },
    image: product.images.map((image) => `${config.domain}/${image.src}`),
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: String(prices[product.sizes[0]]),
      availability: "https://schema.org/PreOrder",
      url: `${config.domain}/products/${product.slug}/`
    }
  };
  const thumbs = product.images.map((image, index) => {
    const d = dims(image.src);
    const current = image.src === start.src;
    return `<button type="button" data-src="/${image.src}" data-alt="${esc(image.alt)}" aria-label="Show image ${index + 1}" aria-current="${current ? "true" : "false"}"><img src="/${image.src}" alt="" width="${d.width}" height="${d.height}"></button>`;
  }).join("");
  const sd = dims(start.src);
  const body = `<div class="wrap" style="padding-top:1.2rem">
    <p class="crumbs"><a href="/">Home</a> · <a href="/collections/${collection.slug}/">${esc(collection.name)}</a> · ${esc(product.name)}</p>
    <div class="product">
      <div class="gallery">
        <div class="gallery-main"><img id="galleryMain" src="/${start.src}" alt="${esc(start.alt)}" width="${sd.width}" height="${sd.height}" fetchpriority="high"></div>
        ${product.images.length > 1 ? `<div class="thumbs">${thumbs}</div>` : ""}
      </div>
      <div class="buy">
        <h1 class="display">${esc(product.name)}</h1>
        ${product.verse ? `<p class="verse">${esc(product.verse)}</p>` : ""}
        <p class="price" id="price">${esc(shownPrice)}</p>
        <p class="price-note">${esc(config.priceNote)}</p>
        ${note ? `<p class="fine">${esc(note)}</p>` : ""}
        <div class="swatches"><span class="swatch" style="background:${product.colors[0].hex}"></span><span>${esc(product.colors[0].name)}</span></div>
        <div class="size-row"><span class="eyebrow" style="color:var(--muted)">Size</span><a href="/size-guide/">Size guide</a></div>
        <div class="sizes" role="group" aria-label="Size">
          ${product.sizes.map((size) => `<button type="button" class="size-btn" data-size="${esc(size)}" aria-pressed="${single ? "true" : "false"}">${esc(size)}</button>`).join("")}
        </div>
        <button class="btn btn-dark btn-block add-btn" id="addBtn" type="button">Add to bag</button>
        <p class="add-hint" id="addHint" role="status"></p>
        <p class="photo-note">${anyPlaceholder ? "A studio photograph is still on the way for at least one view. The stand-in is labeled, and the real file replaces it in the same place." : "Mockup photographs. The sample may vary slightly."}</p>
        <div class="acc">
          <details open><summary>Details</summary><p>${esc(product.description)}</p><ul>${product.details.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></details>
          <details><summary>Fit</summary><p>${esc(product.fit)}</p></details>
          <details><summary>Shipping</summary><p>${esc(config.shippingNote)} Checkout is not open yet, so nothing ships today.</p></details>
        </div>
      </div>
    </div>
  </div>
  <script type="application/json" id="product-data">${json(data)}</script>
  <script type="application/ld+json">${json(ld)}</script>`;
  write(`products/${product.slug}/index.html`, layout({
    title: product.name,
    description: product.summary,
    path: `/products/${product.slug}/`,
    body
  }));
}

function about() {
  const body = `<article class="wrap prose" style="padding-top:1.6rem">
    <p class="eyebrow" style="color:var(--forest)">Est. 2026</p>
    <h1 class="display">Faith, a fairway, and a shirt you will actually wear.</h1>
    <p class="lede">${esc(config.tagline)}</p>
    <p style="margin-top:1rem">Seventh Day Golf started in 2026. The name is the seventh day, the one set aside, and the hours a lot of us spend on a golf course with the people we love.</p>
    <p>We make apparel for people who want faith and the game in the same place. Not a slogan for its own sake. Pieces for the range, for Sunday, and for the rest of the week. The graphics carry scripture, a crown, and a blackletter mark with a golf club for an underline.</p>
    <p>The first pieces are oversized tees, headwear, athletic shorts, and a towel. We are waiting on samples before anything is sold. The prices on this site are placeholders, in one file, until that drop is real.</p>
    <p>If you want a note when checkout opens, <a href="/checkout/" style="border-bottom:1px solid var(--ink)">leave your email</a>.</p>
  </article>`;
  write("about/index.html", layout({
    title: "About",
    description: "Seventh Day Golf is a Christian golf apparel label founded in 2026. On the seventh day, there was golf.",
    path: "/about/",
    body
  }));
}

function sizeGuide() {
  const tee = products.find((p) => p.priceKey === "tee");
  const shorts = products.find((p) => p.priceKey === "shorts");
  const rows = (product) => product.sizes.map((size) => `<tr><td>${size}</td><td>${formatMoney(resolvedPrices(product, config)[size])}</td></tr>`).join("");
  const body = `<article class="wrap prose" style="padding-top:1.6rem">
    <h1 class="display">Size guide</h1>
    <p class="lede">Oversized on purpose. Garment measurements will be added when the samples are approved.</p>
    <h2>Tees and shorts</h2>
    <p>Tees and athletic shorts come in 2XS, XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL, and 6XL. If you want the piece closer to the body, size down. The dollar amounts below are the placeholder prices, not a fit measurement.</p>
    <div class="table-wrap"><table><caption class="visually-hidden" style="position:absolute;width:1px;height:1px;overflow:hidden">Tee sizes and placeholder prices</caption><thead><tr><th>Tee size</th><th>Placeholder price</th></tr></thead><tbody>${rows(tee)}</tbody></table></div>
    <div class="table-wrap"><table><thead><tr><th>Shorts size</th><th>Placeholder price</th></tr></thead><tbody>${rows(shorts)}</tbody></table></div>
    <h2>How to measure</h2>
    <p>Chest: around the fullest part, tape level, about an inch below the armhole. Waist: around the natural waist. Hips: around the fullest part. Hold the tape snug, not tight. We will publish finished garment measurements beside these body numbers once the samples are in hand.</p>
    <h2>Headwear</h2>
    <p>The rope cap, bucket hat, dad hat, and cuffed beanie are one size.</p>
    <h2>Towel</h2>
    <p>The Jesus Is My Caddie towel is one size, 16 by 24 inches.</p>
  </article>`;
  write("size-guide/index.html", layout({
    title: "Size guide",
    description: "Seventh Day Golf size guide. Oversized tees and shorts from 2XS to 6XL. Hats, beanie, and towel are one size.",
    path: "/size-guide/",
    body
  }));
}

function faq() {
  const items = [
    ["Can I check out yet?", "Not yet. We are waiting on product samples before any order is taken. The bag on this site is saved in your browser so you can set sizes aside. Checkout shows a dropping-soon note and an email capture. Nothing is charged."],
    ["When does it ship?", "These pieces will be printed on demand. After checkout opens, plan on about 2–7 business days after production, and then carrier time. We will publish the exact window with the first drop."],
    ["Are the prices final?", "No. Every price is a placeholder in data/config.json: tees $45 (2XS–XL) and $52 (2XL–6XL), shorts $58 and $68 on the same split, rope cap $34, bucket hat $34, dad hat $32, beanie $30, towel $25. They change in that one file."],
    ["What about returns?", "A returns policy will be posted before the first paid order. Until then there is nothing to return, because we are not taking payment."],
    ["Where do the photos come from?", "These are mockups of the samples. The cloth in hand may vary slightly. New files replace the WebPs in images/products when a piece is reshot."],
    ["Who do I write?", `Email ${config.notifyEmail}. The contact page opens that note in your mail app.`]
  ];
  const body = `<article class="wrap prose faq" style="padding-top:1.6rem">
    <h1 class="display">Shipping &amp; questions</h1>
    <p class="lede">Pre-launch. Print on demand once the drop is real.</p>
    ${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
  </article>`;
  write("faq/index.html", layout({
    title: "Shipping & FAQ",
    description: "Seventh Day Golf shipping, pre-launch checkout, placeholder prices, and returns.",
    path: "/faq/",
    body
  }));
}

function contact() {
  const body = `<div class="wrap prose" style="padding-top:1.6rem">
    <div class="contact-grid">
      <div>
        <h1 class="display">Contact</h1>
        <p class="lede">Questions about a piece, a size, or the drop.</p>
        <p style="margin-top:.8rem">We read every note. This form opens an email to ${esc(config.notifyEmail)}. Change that address in data/config.json if the mailbox is different.</p>
      </div>
      <form id="contactForm">
        <label class="field"><span>Name</span><input name="name" required autocomplete="name"></label>
        <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
        <label class="field"><span>Note</span><textarea name="message" rows="5" required></textarea></label>
        <button class="btn btn-dark" type="submit">Send</button>
        <p class="form-msg" id="contactMsg" role="status"></p>
      </form>
    </div>
  </div>`;
  write("contact/index.html", layout({
    title: "Contact",
    description: "Write Seventh Day Golf about a piece, a size, or the first drop.",
    path: "/contact/",
    body
  }));
}

function checkout() {
  const body = `<div class="wrap prose" style="padding-top:1.6rem">
    <h1 class="display">Checkout</h1>
    <div class="check-box">
      <p class="eyebrow" style="color:var(--forest)">Pre-launch</p>
      <h2 class="display">Dropping soon.</h2>
      <p>Samples are still being approved, so we are not taking payment. Your bag stays on this device. Leave an email and we will write when the drop is actually open.</p>
      <div id="checkoutBag"></div>
      <form id="notifyForm" style="margin-top:1rem">
        <label class="field"><span>Email</span><input type="email" required autocomplete="email" placeholder="you@email.com" aria-label="Email address"></label>
        <button class="btn btn-dark" type="submit">Notify me at the drop</button>
      </form>
      <p class="form-msg" id="notifyMsg" role="status"></p>
      <p class="fine" style="margin-top:.8rem">Or write directly: <a href="mailto:${esc(config.notifyEmail)}">${esc(config.notifyEmail)}</a></p>
    </div>
  </div>`;
  write("checkout/index.html", layout({
    title: "Checkout",
    description: "Seventh Day Golf checkout is pre-launch. Leave an email to be notified when the drop opens. No payment is taken.",
    path: "/checkout/",
    body,
    newsletter: false
  }));
}

function notFound() {
  const body = `<div class="wrap prose" style="padding:4rem 0">
    <h1 class="display">Out of bounds.</h1>
    <p class="lede">That page is not on the course.</p>
    <p style="margin-top:1rem"><a class="btn btn-dark" href="/">Back home</a> <a class="btn btn-line" href="/shop/">Shop all</a></p>
  </div>`;
  write("404.html", layout({
    title: "Page not found",
    description: "That Seventh Day Golf page does not exist.",
    path: "/404.html",
    body
  }));
}

for (const dir of ["shop", "collections", "products", "about", "size-guide", "faq", "contact", "checkout"]) {
  rmSync(join(root, dir), { recursive: true, force: true });
}

home();
catalog({
  title: "Shop all",
  description: "Shop all Seventh Day Golf apparel. Tees, headwear, shorts, and accessories. Pre-launch.",
  path: "/shop/",
  blurb: "The whole first drop, in one place. Prices are placeholders until the samples are approved.",
  list: products
});
for (const collection of COLLECTIONS) {
  catalog({
    title: collection.name,
    description: `${collection.name} from Seventh Day Golf. ${collection.blurb}`,
    path: `/collections/${collection.slug}/`,
    blurb: collection.blurb,
    list: products.filter(collection.filter)
  });
}
for (const product of products) productPage(product);
about();
sizeGuide();
faq();
contact();
checkout();
notFound();

const urls = ["/", "/shop/", "/about/", "/size-guide/", "/faq/", "/contact/", "/checkout/", ...COLLECTIONS.map((c) => `/collections/${c.slug}/`), ...products.map((p) => `/products/${p.slug}/`)];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${config.domain}${url}</loc></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${config.domain}/sitemap.xml\n`);

console.log(`built ${products.length} products, ${COLLECTIONS.length} collections`);

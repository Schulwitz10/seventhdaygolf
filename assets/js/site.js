import { readCart, addLine, setQty, removeLine, countItems, subtotal } from "./cart.js";
import { beginCheckout } from "./checkout.js";
import { formatMoney } from "./pricing.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function lock(on) {
  document.body.classList.toggle("lock", on);
}

function cartButtonLabel(n) {
  const btn = $("#cartOpen");
  if (!btn) return;
  btn.setAttribute("aria-label", n ? `Open bag, ${n} ${n === 1 ? "item" : "items"}` : "Open bag");
}

function renderCart() {
  const cart = readCart();
  const n = countItems(cart);
  const badge = $("#cartCount");
  if (badge) {
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }
  cartButtonLabel(n);
  const items = $("#cartItems");
  if (!items) return;
  if (!cart.lines.length) {
    items.innerHTML = `<p class="empty">Your bag is empty.</p>`;
  } else {
    items.innerHTML = cart.lines.map((line) => `
      <article class="cart-line">
        <a href="/products/${line.slug}/"><img src="/${line.image}" alt="${escapeAttr(line.alt || line.name)}" width="76" height="96"></a>
        <div>
          <h3>${escapeHtml(line.name)}</h3>
          <p class="muted">${escapeHtml(line.color)} · ${escapeHtml(line.size)}</p>
          <p>${formatMoney(line.unitPrice)}</p>
          <div class="qty">
            <button type="button" data-qty="${escapeAttr(line.key)}" data-delta="-1" aria-label="Decrease quantity">−</button>
            <span>${line.qty}</span>
            <button type="button" data-qty="${escapeAttr(line.key)}" data-delta="1" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="linkish" data-remove="${escapeAttr(line.key)}">Remove</button>
        </div>
      </article>
    `).join("");
  }
  const sub = $("#cartSubtotal");
  if (sub) sub.textContent = formatMoney(subtotal(cart));
  const checkout = $("#cartCheckout");
  if (checkout) checkout.setAttribute("aria-disabled", cart.lines.length ? "false" : "true");
  renderCheckoutSummary(cart);
}

function renderCheckoutSummary(cart) {
  const box = $("#checkoutBag");
  if (!box) return;
  if (!cart.lines.length) {
    box.innerHTML = `<p class="empty">Your bag is empty. You can still leave an email for the drop.</p>`;
    return;
  }
  box.innerHTML = cart.lines.map((line) => `
    <div class="bag-line">
      <img src="/${line.image}" alt="" width="72" height="90">
      <div>
        <strong>${escapeHtml(line.name)}</strong>
        <p class="muted">${escapeHtml(line.size)} · ${escapeHtml(line.color)} · Qty ${line.qty}</p>
        <p>${formatMoney(line.unitPrice * line.qty)}</p>
      </div>
    </div>
  `).join("") + `<p style="margin-top:.8rem"><strong>Subtotal ${formatMoney(subtotal(cart))}</strong></p>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

let lastFocus = null;
function openCart() {
  const drawer = $("#cartDrawer");
  if (!drawer || !drawer.hidden) return;
  const panel = $("#navMobile");
  if (panel && !panel.hidden) {
    panel.hidden = true;
    $("#menuBtn")?.setAttribute("aria-expanded", "false");
    $(".header")?.classList.remove("is-open");
  }
  lastFocus = document.activeElement;
  drawer.hidden = false;
  lock(true);
  $("#cartClose")?.focus();
}
function closeCart() {
  const drawer = $("#cartDrawer");
  if (!drawer || drawer.hidden) return;
  drawer.hidden = true;
  lock($("#navMobile") && !$("#navMobile").hidden);
  lastFocus?.focus?.();
}

function initNav() {
  const header = $(".header");
  const menu = $("#menuBtn");
  const panel = $("#navMobile");
  if (!menu || !panel) return;
  menu.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    menu.setAttribute("aria-expanded", String(open));
    header.classList.toggle("is-open", open);
    if (open) closeCart();
    lock(open || !$("#cartDrawer")?.hidden);
  });
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      panel.hidden = true;
      menu.setAttribute("aria-expanded", "false");
      header.classList.remove("is-open");
      lock(false);
    }
  });
}

function initCart() {
  $("#cartOpen")?.addEventListener("click", openCart);
  $$("[data-cart-close]").forEach((el) => el.addEventListener("click", closeCart));
  $("#cartItems")?.addEventListener("click", (event) => {
    const qtyBtn = event.target.closest("[data-qty]");
    if (qtyBtn) {
      const cart = readCart();
      const line = cart.lines.find((entry) => entry.key === qtyBtn.dataset.qty);
      if (line) setQty(line.key, line.qty + Number(qtyBtn.dataset.delta));
      return;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) removeLine(remove.dataset.remove);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCart();
      const panel = $("#navMobile");
      if (panel && !panel.hidden) {
        panel.hidden = true;
        $("#menuBtn")?.setAttribute("aria-expanded", "false");
        $(".header")?.classList.remove("is-open");
        lock(false);
      }
    }
  });
  window.addEventListener("sdg:cart", renderCart);
  window.addEventListener("storage", (event) => {
    if (event.key === "sdg.cart.v1") renderCart();
  });
  renderCart();
}

function initProduct() {
  const node = $("#product-data");
  if (!node) return;
  const product = JSON.parse(node.textContent);
  const main = $("#galleryMain");
  const thumbs = $$(".thumbs button");
  thumbs.forEach((button) => {
    button.addEventListener("click", () => {
      main.src = button.dataset.src;
      main.alt = button.dataset.alt;
      thumbs.forEach((other) => other.setAttribute("aria-current", other === button ? "true" : "false"));
    });
  });

  const sizes = $$(".size-btn");
  const priceEl = $("#price");
  const hint = $("#addHint");
  let selected = product.sizes.length === 1 ? product.sizes[0] : "";
  if (selected) {
    sizes.forEach((button) => button.setAttribute("aria-pressed", button.dataset.size === selected ? "true" : "false"));
    priceEl.textContent = formatMoney(product.prices[selected]);
  }
  sizes.forEach((button) => {
    button.addEventListener("click", () => {
      selected = button.dataset.size;
      sizes.forEach((other) => other.setAttribute("aria-pressed", other === button ? "true" : "false"));
      priceEl.textContent = formatMoney(product.prices[selected]);
      if (hint) hint.textContent = "";
    });
  });

  $("#addBtn")?.addEventListener("click", () => {
    if (!selected) {
      if (hint) hint.textContent = "Choose a size to add this to your bag.";
      sizes[0]?.focus();
      return;
    }
    addLine({
      id: product.id,
      slug: product.slug,
      name: product.name,
      size: selected,
      color: product.color,
      unitPrice: product.prices[selected],
      image: product.image,
      alt: product.imageAlt,
      qty: 1
    });
    if (hint) hint.textContent = "Added to your bag.";
    openCart();
  });
}

function notifyEmail() {
  return document.body.dataset.notifyEmail || "";
}

function mailtoHref(email, subject, body) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function initNotify() {
  const form = $("#notifyForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input[type=email]");
    const email = input.value.trim();
    const msg = $("#notifyMsg");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (msg) msg.textContent = "Enter a valid email.";
      return;
    }
    const cart = readCart();
    const lines = cart.lines.map((line) => `${line.qty} × ${line.name} (${line.size}, ${line.color})`).join("\n");
    const body = `Please tell me when Seventh Day Golf drops.\n\nMy email: ${email}\n\nBag:\n${lines || "(no pieces saved)"}\n`;
    try {
      const saved = JSON.parse(localStorage.getItem("sdg.notify") || "[]");
      saved.push({ email, at: new Date().toISOString() });
      localStorage.setItem("sdg.notify", JSON.stringify(saved.slice(-20)));
    } catch { /* ignore quota */ }
    if (msg) msg.textContent = "If your mail app opened, send the note so it reaches us. Nothing is charged.";
    window.location.href = mailtoHref(notifyEmail(), "Notify me — Seventh Day Golf", body);
  });
}

function initContact() {
  const form = $("#contactForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const msg = $("#contactMsg");
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
      if (msg) msg.textContent = "Add your name, a valid email, and a note.";
      return;
    }
    if (msg) msg.textContent = "Your mail app should open with the note ready to send.";
    window.location.href = mailtoHref(
      notifyEmail(),
      `Seventh Day Golf — note from ${name}`,
      `${message}\n\nFrom: ${name} <${email}>`
    );
  });
}

function initNewsletter() {
  const form = $("#newsletterForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = form.querySelector("input[type=email]").value.trim();
    const msg = $("#newsletterMsg");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (msg) msg.textContent = "Enter a valid email.";
      return;
    }
    if (msg) msg.textContent = "Your mail app should open. Send it and you're on the list for the drop.";
    window.location.href = mailtoHref(notifyEmail(), "Newsletter — Seventh Day Golf", `Add me to the drop list: ${email}`);
  });
}

async function initCheckoutAdapter() {
  if (!$("#checkoutBag")) return;
  const result = await beginCheckout(readCart());
  if (result && result.mode === "redirect" && result.url) {
    window.location.href = result.url;
  }
}

initNav();
initCart();
initProduct();
initNotify();
initContact();
initNewsletter();
initCheckoutAdapter();

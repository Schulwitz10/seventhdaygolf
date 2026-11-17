/** Client-side bag. Persists in localStorage. No network. */

const KEY = "sdg.cart.v1";

function empty() {
  return { lines: [] };
}

export function readCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.lines)) return empty();
    data.lines = data.lines.filter((line) => line && line.key && line.qty > 0 && line.unitPrice >= 0);
    return data;
  } catch {
    return empty();
  }
}

function write(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("sdg:cart"));
}

export function lineKey(id, size, color) {
  return [id, size, color].join("::");
}

export function addLine(item) {
  const cart = readCart();
  const key = lineKey(item.id, item.size, item.color);
  const existing = cart.lines.find((line) => line.key === key);
  if (existing) {
    existing.qty = Math.min(10, existing.qty + (item.qty || 1));
    existing.unitPrice = item.unitPrice;
    existing.name = item.name;
    existing.image = item.image;
    existing.alt = item.alt;
    existing.slug = item.slug;
  } else {
    cart.lines.push({
      key,
      id: item.id,
      slug: item.slug,
      name: item.name,
      size: item.size,
      color: item.color,
      unitPrice: item.unitPrice,
      qty: Math.min(10, item.qty || 1),
      image: item.image,
      alt: item.alt || ""
    });
  }
  write(cart);
  return cart;
}

export function setQty(key, qty) {
  const cart = readCart();
  const line = cart.lines.find((entry) => entry.key === key);
  if (!line) return cart;
  if (qty <= 0) cart.lines = cart.lines.filter((entry) => entry.key !== key);
  else line.qty = Math.min(10, qty);
  write(cart);
  return cart;
}

export function removeLine(key) {
  const cart = readCart();
  cart.lines = cart.lines.filter((entry) => entry.key !== key);
  write(cart);
  return cart;
}

export function countItems(cart = readCart()) {
  return cart.lines.reduce((sum, line) => sum + line.qty, 0);
}

export function subtotal(cart = readCart()) {
  return cart.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}

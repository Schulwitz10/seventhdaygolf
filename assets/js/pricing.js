/**
 * Price resolution. Numbers live in data/config.json.
 * A product may set `price` (base override) and `sizePrices` (per-size override).
 * Product sizePrices win over the config table for the same size.
 */

export function priceEntry(product, config) {
  const table = config.prices[product.priceKey];
  if (!table || typeof table.amount !== "number") {
    throw new Error("Missing price for " + product.priceKey);
  }
  return table;
}

export function priceForSize(product, config, size) {
  const table = priceEntry(product, config);
  const base = typeof product.price === "number" ? product.price : table.amount;
  const sizePrices = { ...(table.sizePrices || {}), ...(product.sizePrices || {}) };
  if (size && Object.prototype.hasOwnProperty.call(sizePrices, size) && sizePrices[size] != null) {
    return sizePrices[size];
  }
  return base;
}

export function priceBounds(product, config) {
  const amounts = product.sizes.map((size) => priceForSize(product, config, size));
  return { min: Math.min(...amounts), max: Math.max(...amounts) };
}

export function formatMoney(amount) {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2
  }).format(amount);
}

export function priceLabel(product, config) {
  const { min, max } = priceBounds(product, config);
  if (min === max) return formatMoney(min);
  return "From " + formatMoney(min);
}

const SIZE_ORDER = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

export function upchargeNote(product, config) {
  const table = priceEntry(product, config);
  const base = typeof product.price === "number" ? product.price : table.amount;
  const groups = new Map();
  for (const size of product.sizes) {
    const amount = priceForSize(product, config, size);
    if (amount === base) continue;
    if (!groups.has(amount)) groups.set(amount, []);
    groups.get(amount).push(size);
  }
  const notes = [];
  for (const [amount, sizes] of groups) {
    notes.push(rangeLabel(sizes) + " " + formatMoney(amount));
  }
  return notes.join(". ");
}

function rangeLabel(sizes) {
  const idx = sizes.map((size) => SIZE_ORDER.indexOf(size));
  const contiguous = idx.every((n, i) => n >= 0 && (i === 0 || n === idx[i - 1] + 1));
  if (contiguous && sizes.length > 1) return sizes[0] + "–" + sizes[sizes.length - 1];
  if (sizes.length === 1) return sizes[0];
  return sizes.slice(0, -1).join(", ") + " and " + sizes[sizes.length - 1];
}

export function resolvedPrices(product, config) {
  const prices = {};
  for (const size of product.sizes) prices[size] = priceForSize(product, config, size);
  return prices;
}

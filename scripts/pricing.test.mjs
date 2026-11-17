import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { priceForSize, priceLabel, upchargeNote, formatMoney } from "../assets/js/pricing.js";

const config = JSON.parse(readFileSync(new URL("../data/config.json", import.meta.url)));
const { products } = JSON.parse(readFileSync(new URL("../data/products.json", import.meta.url)));
const byId = Object.fromEntries(products.map((product) => [product.id, product]));

test("oversized tee prices step up at 2XL", () => {
  const tee = byId["tee-walk-on-water"];
  assert.equal(priceForSize(tee, config, "2XS"), 45);
  assert.equal(priceForSize(tee, config, "XL"), 45);
  assert.equal(priceForSize(tee, config, "2XL"), 52);
  assert.equal(priceForSize(tee, config, "6XL"), 52);
  assert.equal(priceLabel(tee, config), "From $45");
  assert.match(upchargeNote(tee, config), /2XL–6XL \$52/);
});

test("shorts prices step up at 2XL", () => {
  const shorts = byId["shorts-athletic-black"];
  assert.equal(priceForSize(shorts, config, "M"), 58);
  assert.equal(priceForSize(shorts, config, "5XL"), 68);
});

test("headwear and towel are flat one-size prices", () => {
  assert.equal(priceForSize(byId["rope-cap-black"], config, "One Size"), 34);
  assert.equal(priceForSize(byId["hat-bucket-white"], config, "One Size"), 34);
  assert.equal(priceForSize(byId["hat-dad-black"], config, "One Size"), 32);
  assert.equal(priceForSize(byId["beanie-black"], config, "One Size"), 30);
  assert.equal(priceForSize(byId["towel-jesus-caddie"], config, "One Size"), 25);
  assert.equal(priceLabel(byId["rope-cap-black"], config), "$34");
});

test("a product sizePrices entry overrides the config table", () => {
  const tee = {
    ...byId["tee-walk-on-water"],
    price: 40,
    sizePrices: { "6XL": 60, "M": 41 }
  };
  assert.equal(priceForSize(tee, config, "S"), 40);
  assert.equal(priceForSize(tee, config, "M"), 41);
  assert.equal(priceForSize(tee, config, "2XL"), 52);
  assert.equal(priceForSize(tee, config, "6XL"), 60);
});

test("money format drops empty cents", () => {
  assert.equal(formatMoney(45), "$45");
  assert.equal(formatMoney(45.5), "$45.50");
});

test("every product has the fields a future checkout needs", () => {
  for (const product of products) {
    assert.ok(product.id && product.slug && product.collection);
    assert.ok(product.sizes.length);
    assert.equal(typeof product.commerce.shopifyProductId, "string");
    assert.equal(typeof product.commerce.stripePaymentLink, "string");
    assert.ok(product.commerce.shopifyVariantIds);
    assert.ok(product.images.length);
    assert.ok(config.prices[product.priceKey]);
  }
});

import { describe, expect, it } from "vitest";
import { validateBagStock, type BagLine, type Product } from "@/lib/store";

function line(overrides: Partial<BagLine> = {}): BagLine {
  const product: Product = {
    id: "shoe-1",
    name: "Tênis Casual",
    category: "fem",
    subcategory: "Tênis casuais",
    price: 129.9,
    promoPrice: null,
    tags: [],
    sizes: [{ size: "36", qty: 2 }],
    colors: ["Preto"],
    description: "",
    images: [],
    active: true,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  return {
    productId: product.id,
    size: "36",
    color: "Preto",
    qty: 1,
    product,
    ...overrides,
  };
}

describe("validateBagStock", () => {
  it("accepts a quantity within the registered stock", () => {
    expect(validateBagStock([line({ qty: 2 })])).toEqual([]);
  });

  it("reports when the requested quantity exceeds stock", () => {
    expect(validateBagStock([line({ qty: 3 })])).toEqual([
      "Tênis Casual (nº 36): disponível 2, solicitado 3.",
    ]);
  });

  it("reports an unregistered size as unavailable when stock is tracked", () => {
    expect(validateBagStock([line({ size: "37" })])).toEqual([
      "Tênis Casual (nº 37): disponível 0, solicitado 1.",
    ]);
  });

  it("does not block products without registered size stock", () => {
    const item = line();
    item.product = { ...item.product, sizes: [] };
    expect(validateBagStock([item])).toEqual([]);
  });
});

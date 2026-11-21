import { describe, expect, it } from "vitest";
import {
  buildOrderMessage,
  deliveryErrors,
  EMPTY_DELIVERY,
  effectivePrice,
  discountPercent,
  type BagLine,
  type Product,
} from "@/lib/store";

const product: Product = {
  id: "shoe-1",
  name: "Tênis Casual",
  category: "fem",
  subcategory: "Tênis casuais",
  price: 129.9,
  promoPrice: 99.9,
  tags: [],
  sizes: [{ size: "36", qty: 2 }],
  colors: ["Preto"],
  description: "",
  images: [],
  active: true,
  sortOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const orderLine: BagLine = {
  productId: product.id,
  size: "36",
  color: "Preto",
  qty: 1,
  product,
};

describe("store pricing rules", () => {
  it("uses the promotional price when it is lower than the regular price", () => {
    expect(effectivePrice(product)).toBe(99.9);
    expect(discountPercent(product)).toBe(23);
  });

  it("ignores a promotional price that is not lower than the regular price", () => {
    expect(effectivePrice({ price: 100, promoPrice: 100 })).toBe(100);
    expect(effectivePrice({ price: 100, promoPrice: 120 })).toBe(100);
  });

  it("uses a valid promotional price when no regular price is registered", () => {
    expect(effectivePrice({ price: null, promoPrice: 49.9 })).toBe(49.9);
  });
});

describe("delivery and WhatsApp order message", () => {
  it("requires the delivery recipient and address fields", () => {
    expect(deliveryErrors(EMPTY_DELIVERY)).toEqual({
      name: "Informe seu nome",
      street: "Informe rua e número",
      district: "Informe o bairro",
      city: "Informe a cidade",
    });
  });

  it("includes product, size, total and delivery address in the order message", () => {
    const delivery = {
      ...EMPTY_DELIVERY,
      name: "Ana",
      street: "Rua das Flores, 10",
      district: "Centro",
      city: "Campina Grande",
      payment: "Pix",
    };

    const message = buildOrderMessage([orderLine], delivery);

    expect(message).toContain("Tênis Casual");
    expect(message).toContain("Nº 36");
    expect(message).toContain("Total dos itens: R$ 99,90");
    expect(message).toContain("Rua das Flores, 10 - Centro, Campina Grande");
    expect(message).toContain("Pagamento: Pix");
  });
});

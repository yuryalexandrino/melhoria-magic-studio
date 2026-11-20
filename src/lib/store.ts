// Pure store rules shared by the shop, the bag and the owner panel.

export type CategoryKey = "fem" | "mas" | "inf";

export const CATEGORIES: Record<CategoryKey, { name: string; slug: CategoryKey; lines: string[] }> = {
  fem: {
    name: "Feminino",
    slug: "fem",
    lines: ["Tênis casuais", "Tênis esportivos", "Sandálias", "Chinelos", "Slides", "Bolsas e acessórios"],
  },
  mas: {
    name: "Masculino",
    slug: "mas",
    lines: ["Tênis casuais", "Tênis esportivos", "Calçados do dia a dia", "Chinelos e slides"],
  },
  inf: {
    name: "Infantil",
    slug: "inf",
    lines: ["Tênis infantis", "Calçados casuais", "Modelos para crianças"],
  },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];
export const isCategory = (v: string): v is CategoryKey => v in CATEGORIES;

export const TAGS = ["Novidade", "Mais vendido", "Oferta"] as const;

export const DEFAULT_SIZES: Record<CategoryKey, string[]> = {
  fem: ["33", "34", "35", "36", "37", "38", "39"],
  mas: ["38", "39", "40", "41", "42", "43", "44"],
  inf: ["22", "24", "26", "28", "30", "32", "34"],
};

export type SizeStock = { size: string; qty: number };

export type Product = {
  id: string;
  name: string;
  category: CategoryKey;
  subcategory: string;
  price: number | null;
  promoPrice: number | null;
  tags: string[];
  sizes: SizeStock[];
  colors: string[];
  description: string;
  images: string[];
  active: boolean;
  sortOrder: number;
  createdAt: string;
};

export type StoreSettings = {
  whatsapp: string;
  instagram: string;
  heroTitle: string;
  heroSubtitle: string;
  bannerUrl: string;
  announcement: string;
  about: string;
  privacy: string;
  returns: string;
  delivery: string;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  whatsapp: "558391082240",
  instagram: "rafaela.shoes2",
  heroTitle: "Seu estilo começa pelos pés!",
  heroSubtitle: "Tênis, sandálias, chinelos e acessórios para toda a família, com novidades toda semana.",
  bannerUrl: "",
  announcement: "Entregamos na sua casa · Peça pelo WhatsApp",
  about: "",
  privacy: "",
  returns: "",
  delivery: "",
};

/* ---------- conversions from database rows ---------- */

type ProductRow = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number | string | null;
  promo_price: number | string | null;
  tags: string[];
  sizes: unknown;
  colors: string[];
  description: string;
  images: string[];
  active: boolean;
  sort_order: number;
  created_at: string;
};

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function parseSizes(raw: unknown): SizeStock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const o = r as { size?: unknown; qty?: unknown };
      return { size: String(o?.size ?? "").trim(), qty: Math.max(0, Math.floor(Number(o?.qty) || 0)) };
    })
    .filter((s) => s.size !== "");
}

export function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    category: isCategory(r.category) ? r.category : "fem",
    subcategory: r.subcategory,
    price: num(r.price),
    promoPrice: num(r.promo_price),
    tags: r.tags ?? [],
    sizes: parseSizes(r.sizes),
    colors: (r.colors ?? []).filter(Boolean),
    description: r.description ?? "",
    images: r.images ?? [],
    active: r.active,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  };
}

type SettingsRow = {
  whatsapp: string;
  instagram: string;
  hero_title: string;
  hero_subtitle: string;
  banner_url: string;
  announcement: string;
  about: string;
  privacy: string;
  returns: string;
  delivery: string;
};

export function toSettings(r: SettingsRow): StoreSettings {
  return {
    whatsapp: r.whatsapp,
    instagram: r.instagram,
    heroTitle: r.hero_title,
    heroSubtitle: r.hero_subtitle,
    bannerUrl: r.banner_url,
    announcement: r.announcement,
    about: r.about,
    privacy: r.privacy,
    returns: r.returns,
    delivery: r.delivery,
  };
}

/* ---------- prices ---------- */

export function formatBRL(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const [int = "0", dec = "00"] = value.toFixed(2).split(".");
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
}

/** A promotional price only counts when it is lower than the regular price (or there is no regular price). */
export function hasPromo(p: Pick<Product, "price" | "promoPrice">): boolean {
  if (p.promoPrice === null || p.promoPrice <= 0) return false;
  return p.price === null || p.promoPrice < p.price;
}

export function effectivePrice(p: Pick<Product, "price" | "promoPrice">): number | null {
  if (hasPromo(p)) return p.promoPrice;
  return p.price !== null && p.price > 0 ? p.price : null;
}

export function discountPercent(p: Pick<Product, "price" | "promoPrice">): number | null {
  if (!hasPromo(p) || p.price === null || p.promoPrice === null) return null;
  return Math.round((1 - p.promoPrice / p.price) * 100);
}

export const isOnSale = (p: Product) => hasPromo(p) || p.tags.includes("Oferta");

/* ---------- sizes and stock ---------- */

export type SizeOption = { size: string; available: boolean; confirmOnWhatsApp: boolean };

/** Bags and accessories have no size unless the owner registers one. */
export function needsSize(p: Pick<Product, "sizes" | "subcategory">): boolean {
  if (p.sizes.length > 0) return true;
  return !/bolsa|acess/i.test(p.subcategory);
}

export function sizeOptions(p: Pick<Product, "sizes" | "subcategory" | "category">): SizeOption[] {
  if (p.sizes.length > 0) {
    return p.sizes.map((s) => ({ size: s.size, available: s.qty > 0, confirmOnWhatsApp: false }));
  }
  if (!needsSize(p)) return [];
  return DEFAULT_SIZES[p.category].map((size) => ({ size, available: true, confirmOnWhatsApp: true }));
}

export function isSoldOut(p: Pick<Product, "sizes">): boolean {
  return p.sizes.length > 0 && p.sizes.every((s) => s.qty <= 0);
}

export function stockFor(p: Pick<Product, "sizes">, size: string): number | null {
  if (p.sizes.length === 0) return null;
  return p.sizes.find((s) => s.size === size)?.qty ?? 0;
}

/* ---------- bag and order ---------- */

export type BagItem = { productId: string; size: string; color: string; qty: number };

export type BagLine = BagItem & { product: Product };

export function bagLines(items: BagItem[], products: Product[]): BagLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.flatMap((i) => {
    const product = byId.get(i.productId);
    return product ? [{ ...i, product }] : [];
  });
}

export function bagTotals(lines: BagLine[]) {
  let total = 0;
  let unpriced = 0;
  let count = 0;
  for (const l of lines) {
    count += l.qty;
    const v = effectivePrice(l.product);
    if (v === null) unpriced += l.qty;
    else total += v * l.qty;
  }
  return { total: Math.round(total * 100) / 100, unpriced, count };
}

export const PAYMENT_METHODS = ["Pix", "Cartão", "Dinheiro"] as const;

export type DeliveryInfo = {
  name: string;
  street: string;
  district: string;
  city: string;
  reference: string;
  payment: string;
  notes: string;
};

export const EMPTY_DELIVERY: DeliveryInfo = {
  name: "",
  street: "",
  district: "",
  city: "",
  reference: "",
  payment: "Pix",
  notes: "",
};

export function deliveryErrors(d: DeliveryInfo): Partial<Record<keyof DeliveryInfo, string>> {
  const e: Partial<Record<keyof DeliveryInfo, string>> = {};
  if (d.name.trim().length < 2) e.name = "Informe seu nome";
  if (d.street.trim().length < 3) e.street = "Informe rua e número";
  if (d.district.trim().length < 2) e.district = "Informe o bairro";
  if (d.city.trim().length < 2) e.city = "Informe a cidade";
  return e;
}

export function buildOrderMessage(lines: BagLine[], d: DeliveryInfo): string {
  const items = lines.map((l, i) => {
    const parts = [`${i + 1}. ${l.product.name}`];
    if (needsSize(l.product)) parts.push(`Nº ${l.size || "a confirmar"}`);
    if (l.color) parts.push(`Cor ${l.color}`);
    parts.push(`${l.qty}x`);
    parts.push(formatBRL(effectivePrice(l.product)) ?? "preço a consultar");
    return parts.join(" | ");
  });
  const { total, unpriced } = bagTotals(lines);
  const out = [
    "Olá! Vim pelo site da Rafaela Shoes e quero fazer este pedido:",
    "",
    ...items,
    "",
    `Total dos itens: ${formatBRL(total)}${unpriced ? ` (+ ${unpriced} item(ns) com preço a confirmar)` : ""}`,
    "",
    "*Entrega para:*",
    d.name.trim(),
    `${d.street.trim()} - ${d.district.trim()}, ${d.city.trim()}`,
  ];
  if (d.reference.trim()) out.push(`Referência: ${d.reference.trim()}`);
  out.push(`Pagamento: ${d.payment}`);
  if (d.notes.trim()) out.push(`Observações: ${d.notes.trim()}`);
  out.push("", "Pode me confirmar a disponibilidade e o valor do frete?");
  return out.join("\n");
}

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function isValidWhatsApp(number: string): boolean {
  const d = number.replace(/\D/g, "");
  return d.startsWith("55") && (d.length === 12 || d.length === 13);
}

export function formatWhatsApp(number: string): string {
  const d = number.replace(/\D/g, "");
  if (d.length === 13) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `(${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return d;
}

export function searchProducts(products: Product[], q: string): Product[] {
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return products.filter((p) => {
    const hay = norm([p.name, p.subcategory, CATEGORIES[p.category].name, p.colors.join(" "), p.description].join(" "));
    return terms.every((t) => hay.includes(t));
  });
}

export type SortKey = "destaques" | "menor-preco" | "maior-preco" | "novidades";

export function sortProducts(list: Product[], sort: SortKey): Product[] {
  const arr = [...list];
  const price = (p: Product) => effectivePrice(p);
  if (sort === "menor-preco") arr.sort((a, b) => (price(a) ?? Infinity) - (price(b) ?? Infinity));
  else if (sort === "maior-preco") arr.sort((a, b) => (price(b) ?? -Infinity) - (price(a) ?? -Infinity));
  else if (sort === "novidades") arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else arr.sort((a, b) => a.sortOrder - b.sortOrder);
  return arr;
}

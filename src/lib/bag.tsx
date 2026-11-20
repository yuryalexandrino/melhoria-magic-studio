import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BagItem } from "./store";

const KEY = "rs_bag_v2";

type BagCtx = {
  items: BagItem[];
  add: (item: Omit<BagItem, "qty">, qty?: number) => void;
  setQty: (index: number, qty: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  checkoutOpen: boolean;
  setCheckoutOpen: (v: boolean) => void;
};

const Ctx = createContext<BagCtx | null>(null);

export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, loaded]);

  const add = useCallback((item: Omit<BagItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.productId === item.productId && p.size === item.size && p.color === item.color);
      if (i >= 0) return prev.map((p, k) => (k === i ? { ...p, qty: p.qty + qty } : p));
      return [...prev, { ...item, qty }];
    });
  }, []);
  const setQty = useCallback(
    (index: number, qty: number) =>
      setItems((prev) => (qty < 1 ? prev.filter((_, k) => k !== index) : prev.map((p, k) => (k === index ? { ...p, qty } : p)))),
    [],
  );
  const remove = useCallback((index: number) => setItems((prev) => prev.filter((_, k) => k !== index)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, add, setQty, remove, clear, open, setOpen, checkoutOpen, setCheckoutOpen }),
    [items, add, setQty, remove, clear, open, checkoutOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBag() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBag must be used inside BagProvider");
  return c;
}

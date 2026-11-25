CREATE TABLE public.sales_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 idempotency_key uuid NOT NULL UNIQUE,
 request_hash text NOT NULL,
 source_hash text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','shipped','delivered','cancelled')),
 delivery jsonb NOT NULL,
 payment_method text NOT NULL,
 subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
 shipping numeric(12,2) CHECK (shipping >= 0),
 total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 confirmed_at timestamptz,
 cancelled_at timestamptz
);
GRANT SELECT ON public.sales_orders TO authenticated;
GRANT ALL ON public.sales_orders TO service_role;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads orders" ON public.sales_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.sales_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
 product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
 name text NOT NULL,
 description text NOT NULL DEFAULT '',
 unit_price numeric(12,2) CHECK (unit_price >= 0),
 quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
 size text NOT NULL DEFAULT '',
 color text NOT NULL DEFAULT '',
 image text NOT NULL DEFAULT '',
 needs_size boolean NOT NULL DEFAULT false,
 inventory_quantity integer NOT NULL DEFAULT 0 CHECK (inventory_quantity >= 0),
 inventory_restored boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sales_order_items TO authenticated;
GRANT ALL ON public.sales_order_items TO service_role;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads order items" ON public.sales_order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.sales_order_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
 status text NOT NULL,
 actor_id uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sales_order_events TO authenticated;
GRANT ALL ON public.sales_order_events TO service_role;
ALTER TABLE public.sales_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads order events" ON public.sales_order_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX sales_orders_created_idx ON public.sales_orders(created_at DESC);
CREATE INDEX sales_orders_confirmed_idx ON public.sales_orders(confirmed_at) WHERE confirmed_at IS NOT NULL;
CREATE INDEX sales_orders_status_created_idx ON public.sales_orders(status, created_at DESC);
CREATE INDEX sales_orders_source_idx ON public.sales_orders(source_hash, created_at DESC);
CREATE INDEX sales_order_items_order_idx ON public.sales_order_items(order_id);
CREATE INDEX sales_order_items_product_idx ON public.sales_order_items(product_id);
CREATE INDEX sales_order_events_order_idx ON public.sales_order_events(order_id, created_at);

CREATE FUNCTION public.create_sales_order(p_key uuid, p_hash text, p_source text, p_delivery jsonb, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.sales_orders%ROWTYPE; p public.products%ROWTYPE; item jsonb; v_price numeric(12,2); v_stock integer; v_subtotal numeric(12,2) := 0; v_qty integer; grouped record;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text, 0));
 SELECT * INTO o FROM public.sales_orders WHERE idempotency_key = p_key;
 IF FOUND THEN
  IF o.request_hash <> p_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN jsonb_build_object('id',o.id,'number',o.number,'items',(SELECT jsonb_agg(to_jsonb(i) - 'inventory_quantity' - 'inventory_restored') FROM public.sales_order_items i WHERE order_id=o.id));
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_source, 1));
 IF (SELECT count(*) FROM public.sales_orders WHERE source_hash=p_source AND created_at > now()-interval '10 minutes') >= 10 THEN RAISE EXCEPTION 'RATE_LIMIT'; END IF;
 IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'INVALID_ITEMS'; END IF;
 IF length(trim(p_delivery->>'name')) < 2 OR length(trim(p_delivery->>'street')) < 3 OR length(trim(p_delivery->>'district')) < 2 OR length(trim(p_delivery->>'city')) < 2 OR p_delivery->>'payment' NOT IN ('Pix','Cartão','Dinheiro') THEN RAISE EXCEPTION 'INVALID_DELIVERY'; END IF;
 -- Lock every product in deterministic order; quantities across colors share the size stock.
 PERFORM id FROM public.products WHERE id IN (SELECT (x->>'productId')::uuid FROM jsonb_array_elements(p_items) x) ORDER BY id FOR UPDATE;
 FOR grouped IN SELECT (x->>'productId')::uuid AS pid, x->>'size' AS sz, sum((x->>'qty')::integer) AS qty FROM jsonb_array_elements(p_items) x GROUP BY 1,2 LOOP
  SELECT * INTO p FROM public.products WHERE id=grouped.pid AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
  IF jsonb_array_length(p.sizes)>0 THEN
   SELECT (s->>'qty')::integer INTO v_stock FROM jsonb_array_elements(p.sizes) s WHERE s->>'size'=grouped.sz;
   IF v_stock IS NULL OR v_stock < grouped.qty THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
  END IF;
 END LOOP;
 INSERT INTO public.sales_orders(idempotency_key,request_hash,source_hash,delivery,payment_method,notes) VALUES (p_key,p_hash,p_source,p_delivery,p_delivery->>'payment',coalesce(p_delivery->>'notes','')) RETURNING * INTO o;
 FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  SELECT * INTO p FROM public.products WHERE id=(item->>'productId')::uuid;
  v_qty := (item->>'qty')::integer;
  IF v_qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  IF cardinality(p.colors)>0 AND NOT coalesce(item->>'color','')=ANY(p.colors) THEN RAISE EXCEPTION 'INVALID_COLOR'; END IF;
  IF (jsonb_array_length(p.sizes)>0 OR p.subcategory !~* 'bolsa|acess') AND coalesce(item->>'size','')='' THEN RAISE EXCEPTION 'INVALID_SIZE'; END IF;
  v_price := CASE WHEN p.promo_price>0 AND (p.price IS NULL OR p.promo_price<p.price) THEN p.promo_price WHEN p.price>0 THEN p.price ELSE NULL END;
  INSERT INTO public.sales_order_items(order_id,product_id,name,description,unit_price,quantity,size,color,image,needs_size)
  VALUES(o.id,p.id,p.name,p.description,v_price,v_qty,coalesce(item->>'size',''),coalesce(item->>'color',''),coalesce(p.images[1],''),jsonb_array_length(p.sizes)>0 OR p.subcategory !~* 'bolsa|acess');
  v_subtotal := v_subtotal + coalesce(v_price,0)*v_qty;
 END LOOP;
 UPDATE public.sales_orders SET subtotal=v_subtotal,total=v_subtotal WHERE id=o.id;
 INSERT INTO public.sales_order_events(order_id,status) VALUES(o.id,'pending');
 RETURN jsonb_build_object('id',o.id,'number',o.number,'items',(SELECT jsonb_agg(to_jsonb(i) - 'inventory_quantity' - 'inventory_restored') FROM public.sales_order_items i WHERE order_id=o.id));
END $$;
REVOKE ALL ON FUNCTION public.create_sales_order(uuid,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_sales_order(uuid,text,text,jsonb,jsonb) TO service_role;

CREATE FUNCTION public.manage_sales_order(p_order uuid, p_status text, p_shipping numeric DEFAULT NULL, p_prices jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.sales_orders%ROWTYPE; item public.sales_order_items%ROWTYPE; p public.products%ROWTYPE; v_stock integer; v_subtotal numeric(12,2); v_shipping numeric(12,2); v_price numeric(12,2);
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF p_status NOT IN ('pending','confirmed','preparing','shipped','delivered','cancelled') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
 SELECT * INTO o FROM public.sales_orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF o.status='cancelled' THEN
  IF p_status='cancelled' THEN RETURN; END IF;
  RAISE EXCEPTION 'CANCELLED_TERMINAL';
 END IF;
 IF o.confirmed_at IS NOT NULL AND p_status='pending' THEN RAISE EXCEPTION 'CANNOT_UNCONFIRM'; END IF;
 IF o.confirmed_at IS NULL AND p_status IN ('preparing','shipped','delivered') THEN RAISE EXCEPTION 'CONFIRM_FIRST'; END IF;
 IF o.confirmed_at IS NULL THEN
  FOR item IN SELECT * FROM public.sales_order_items WHERE order_id=p_order LOOP
   IF p_prices ? item.id::text THEN
    v_price := (p_prices->>item.id::text)::numeric;
    IF v_price IS NULL OR v_price<=0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
    -- Only resolve an initially unknown price, never rewrite a known snapshot.
    IF item.unit_price IS NOT NULL AND item.unit_price<>v_price THEN RAISE EXCEPTION 'IMMUTABLE_PRICE'; END IF;
    UPDATE public.sales_order_items SET unit_price=v_price WHERE id=item.id;
   END IF;
  END LOOP;
 END IF;
 v_shipping := coalesce(p_shipping,o.shipping);
 IF v_shipping < 0 OR v_shipping > 9999999999 THEN RAISE EXCEPTION 'INVALID_SHIPPING'; END IF;
 IF p_status='confirmed' AND o.confirmed_at IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.sales_order_items WHERE order_id=p_order AND unit_price IS NULL) THEN RAISE EXCEPTION 'PRICE_REQUIRED'; END IF;
 END IF;
 -- Products are locked in the same order as creation and concurrent confirmations.
 PERFORM id FROM public.products WHERE id IN (SELECT product_id FROM public.sales_order_items WHERE order_id=p_order) ORDER BY id FOR UPDATE;
 FOR item IN SELECT * FROM public.sales_order_items WHERE order_id=p_order ORDER BY product_id,size,id LOOP
  SELECT * INTO p FROM public.products WHERE id=item.product_id;
  IF p_status='confirmed' AND o.confirmed_at IS NULL THEN
   IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
   IF jsonb_array_length(p.sizes)>0 THEN
    SELECT (s->>'qty')::integer INTO v_stock FROM jsonb_array_elements(p.sizes) s WHERE s->>'size'=item.size;
    IF v_stock IS NULL OR v_stock<item.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
    UPDATE public.products SET sizes=(SELECT jsonb_agg(CASE WHEN s->>'size'=item.size THEN jsonb_set(s,'{qty}',to_jsonb(v_stock-item.quantity)) ELSE s END) FROM jsonb_array_elements(p.sizes) s),updated_at=now() WHERE id=p.id;
    UPDATE public.sales_order_items SET inventory_quantity=item.quantity WHERE id=item.id;
   END IF;
  ELSIF p_status='cancelled' AND item.inventory_quantity>0 AND NOT item.inventory_restored THEN
   IF p.id IS NOT NULL THEN
    SELECT (s->>'qty')::integer INTO v_stock FROM jsonb_array_elements(p.sizes) s WHERE s->>'size'=item.size;
    IF v_stock IS NULL THEN
     UPDATE public.products SET sizes=sizes || jsonb_build_array(jsonb_build_object('size',item.size,'qty',item.inventory_quantity)),updated_at=now() WHERE id=p.id;
    ELSE
     UPDATE public.products SET sizes=(SELECT jsonb_agg(CASE WHEN s->>'size'=item.size THEN jsonb_set(s,'{qty}',to_jsonb(v_stock+item.inventory_quantity)) ELSE s END) FROM jsonb_array_elements(p.sizes) s),updated_at=now() WHERE id=p.id;
    END IF;
   END IF;
   UPDATE public.sales_order_items SET inventory_restored=true WHERE id=item.id;
  END IF;
 END LOOP;
 SELECT coalesce(sum(unit_price*quantity),0) INTO v_subtotal FROM public.sales_order_items WHERE order_id=p_order;
 UPDATE public.sales_orders SET status=p_status,shipping=v_shipping,subtotal=v_subtotal,total=v_subtotal+coalesce(v_shipping,0),updated_at=now(),confirmed_at=CASE WHEN p_status='confirmed' THEN coalesce(confirmed_at,now()) ELSE confirmed_at END,cancelled_at=CASE WHEN p_status='cancelled' THEN now() ELSE cancelled_at END WHERE id=p_order;
 IF o.status<>p_status THEN INSERT INTO public.sales_order_events(order_id,status,actor_id) VALUES(p_order,p_status,auth.uid()); END IF;
END $$;
REVOKE ALL ON FUNCTION public.manage_sales_order(uuid,text,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_sales_order(uuid,text,numeric,jsonb) TO authenticated;

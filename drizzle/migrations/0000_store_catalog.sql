-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Tells the sign-in page whether the store owner account already exists
CREATE OR REPLACE FUNCTION public.store_has_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.store_has_owner() TO anon, authenticated;

-- The first account ever created becomes the store owner
CREATE OR REPLACE FUNCTION public.assign_first_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(424242);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_assign_owner
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_first_owner();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'fem' CHECK (category IN ('fem','mas','inf')),
  subcategory text NOT NULL DEFAULT '',
  price numeric(10,2),
  promo_price numeric(10,2),
  tags text[] NOT NULL DEFAULT '{}',
  sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  colors text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone sees visible products" ON public.products FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Owner sees all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner adds products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner edits products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner removes products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX products_category_idx ON public.products (category, sort_order);

-- Store settings (single row)
CREATE TABLE public.store_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp text NOT NULL DEFAULT '558391082240',
  instagram text NOT NULL DEFAULT 'rafaela.shoes2',
  hero_title text NOT NULL DEFAULT 'Seu estilo começa pelos pés!',
  hero_subtitle text NOT NULL DEFAULT 'Tênis, sandálias, chinelos e acessórios para toda a família, com novidades toda semana.',
  banner_url text NOT NULL DEFAULT '',
  announcement text NOT NULL DEFAULT 'Entregamos na sua casa · Peça pelo WhatsApp',
  about text NOT NULL DEFAULT 'Bem-vindo(a) à Rafaela Shoes! Aqui você encontra tendências, estilo e conforto para todos os momentos. Trabalhamos com opções femininas, masculinas e infantis, trazendo novidades toda semana para você encontrar o modelo perfeito para o seu estilo.',
  privacy text NOT NULL DEFAULT 'Conteúdo a ser definido pela loja.',
  returns text NOT NULL DEFAULT 'Conteúdo a ser definido pela loja.',
  delivery text NOT NULL DEFAULT 'Conteúdo a ser definido pela loja.',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads store settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owner edits store settings" ON public.store_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER store_settings_touch BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.store_settings (id) VALUES (1);

-- Photo storage: only the owner uploads/changes; reads go through the app's image route
CREATE POLICY "Owner reads product images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner uploads product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner updates product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner deletes product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Current catalog
INSERT INTO public.products (name, category, subcategory, tags, images, sort_order) VALUES
('Tênis branco com detalhe rosa','fem','Tênis casuais',ARRAY['Novidade']::text[],ARRAY['/__l5e/assets-v1/b89264a5-b5ed-4bfa-b978-459c818b6fa8/rafaela-ex0-0.jpg']::text[],0),
('Tênis preto com sola branca','fem','Tênis casuais',ARRAY['Novidade']::text[],ARRAY['/__l5e/assets-v1/5be5d199-42b4-4ba7-954c-996d4b371764/rafaela-ex1-0.jpg']::text[],1),
('Tênis branco com detalhe cinza','fem','Tênis casuais',ARRAY['Novidade']::text[],ARRAY['/__l5e/assets-v1/85d66120-16db-42fe-b53b-bb0871cc1409/rafaela-ex2-0.jpg']::text[],2),
('Tênis esportivo marrom','mas','Tênis esportivos',ARRAY['Novidade']::text[],ARRAY['/__l5e/assets-v1/06300da5-7632-490a-a546-85da27a08005/rafaela-ex3-0.jpg']::text[],3),
('Tênis esportivo branco e rosa','fem','Tênis esportivos',ARRAY['Mais vendido']::text[],ARRAY['/__l5e/assets-v1/d2715dc7-b228-42ed-986a-cce5b207eb0f/rafaela-ex4-0.jpg']::text[],4),
('Tênis esportivo preto','mas','Tênis esportivos',ARRAY['Mais vendido']::text[],ARRAY['/__l5e/assets-v1/2b8b7e77-55a5-44ee-9007-6562d4ae9b29/rafaela-ex5-0.jpg']::text[],5),
('Chuteira amarelo neon','mas','Tênis esportivos',ARRAY['Mais vendido']::text[],ARRAY['/__l5e/assets-v1/9a6597c1-9057-4166-9f26-538778311770/rafaela-ex6-0.jpg']::text[],6),
('Chuteira azul e branca','mas','Tênis esportivos',ARRAY['Mais vendido']::text[],ARRAY['/__l5e/assets-v1/0641435b-49af-4db6-9217-113b93fb6f83/rafaela-ex7-0.jpg']::text[],7),
('Tênis casual branco com listras pretas','mas','Tênis casuais','{}'::text[],ARRAY['/__l5e/assets-v1/c8ed1fbb-7135-4f11-bd6c-8e9ab8047d38/rafaela-ex8-0.jpg']::text[],8),
('Tênis casual marrom com listras brancas','mas','Tênis casuais','{}'::text[],ARRAY['/__l5e/assets-v1/268e3497-d771-4708-a123-6d5ea93afafa/rafaela-ex9-0.jpg']::text[],9),
('Bolsa de palha caramelo','fem','Bolsas e acessórios','{}'::text[],ARRAY['/__l5e/assets-v1/005f808c-a942-4ad0-ac70-a3c570bccd6a/rafaela-ex10-0.jpg']::text[],10),
('Bolsa de palha bege','fem','Bolsas e acessórios','{}'::text[],ARRAY['/__l5e/assets-v1/686f1d84-7714-452c-a789-e2d9c289f798/rafaela-ex11-0.jpg']::text[],11),
('Bolsas de palha amarela e off-white','fem','Bolsas e acessórios','{}'::text[],ARRAY['/__l5e/assets-v1/1e3c39c0-50da-4b0e-9750-cdeb34dd2e92/rafaela-ex12-0.jpg']::text[],12),
('Slide acolchoado marrom','fem','Slides','{}'::text[],ARRAY['/__l5e/assets-v1/5602d9f8-095f-49fb-846f-d9e3036061c3/rafaela-ex13-0.jpg']::text[],13),
('Slide acolchoado branco','fem','Slides','{}'::text[],ARRAY['/__l5e/assets-v1/0afd0801-b7f3-41d4-b30a-e739b3e56ee8/rafaela-ex14-0.jpg']::text[],14),
('Slide acolchoado preto','fem','Slides','{}'::text[],ARRAY['/__l5e/assets-v1/e471cc4e-5b5b-4fb9-9965-5a6b586a2057/rafaela-ex15-0.jpg']::text[],15);
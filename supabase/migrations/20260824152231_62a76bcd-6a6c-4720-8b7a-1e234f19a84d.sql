CREATE TABLE public.pos_docs (
  shop_key UUID NOT NULL,
  kind TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_key, kind, doc_id)
);

CREATE INDEX pos_docs_shop_updated_idx ON public.pos_docs (shop_key, updated_at);

GRANT ALL ON public.pos_docs TO service_role;

ALTER TABLE public.pos_docs ENABLE ROW LEVEL SECURITY;
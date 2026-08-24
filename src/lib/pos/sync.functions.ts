import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const kindSchema = z.enum(["table", "bill", "kot", "stock", "staff", "settings"]);

const docSchema = z.object({
  kind: kindSchema,
  id: z.string().min(1).max(64),
  json: z.string().max(200000),
  updatedAt: z.number(),
  deleted: z.boolean().optional(),
});

const pushSchema = z.object({
  shopKey: z.string().uuid(),
  docs: z.array(docSchema).max(500),
});

const pullSchema = z.object({
  shopKey: z.string().uuid(),
  since: z.string().nullable(),
});

export const pushDocs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => pushSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.docs.length) return { ok: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.docs.map((d) => ({
      shop_key: data.shopKey,
      kind: d.kind as string,
      doc_id: d.id,
      data: { j: d.json, u: d.updatedAt },
      deleted: d.deleted ?? false,
      updated_at: new Date(d.updatedAt).toISOString(),
    }));
    const { error } = await supabaseAdmin
      .from("pos_docs")
      .upsert(rows, { onConflict: "shop_key,kind,doc_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pullDocs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => pullSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("pos_docs")
      .select("kind, doc_id, data, deleted, updated_at")
      .eq("shop_key", data.shopKey)
      .order("updated_at", { ascending: true })
      .limit(1000);
    if (data.since) query = query.gt("updated_at", data.since);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const docs = (rows ?? []).map((r) => {
      const payload = (r.data ?? {}) as { j?: string; u?: number };
      return {
        kind: String(r.kind),
        id: String(r.doc_id),
        json: payload.j ?? "null",
        updatedAt: payload.u ?? new Date(String(r.updated_at)).getTime(),
        deleted: Boolean(r.deleted),
      };
    });
    const last = rows?.length ? rows[rows.length - 1] : null;
    const cursor: string | null = last ? String(last.updated_at) : data.since;
    return { docs, cursor };
  });

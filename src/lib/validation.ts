import { z } from "zod";

const MAX_NOTE_BYTES = 1_000_000;

export const authRequestSchema = z.object({
  email: z.email().max(320),
});

export const noteInputSchema = z.object({
  title: z.string().max(500),
  body: z.string().max(MAX_NOTE_BYTES),
  folder: z.string().max(300).nullable().default(null),
  tags: z.array(z.string().max(64)).max(64).default([]),
});

export const syncPushItemSchema = noteInputSchema.extend({
  id: z.string().min(1).max(64),
  createdAt: z.number(),
  updatedAt: z.number(),
  deleted: z.boolean(),
  baseVersion: z.number().int().nonnegative(),
});

export const syncPushSchema = z.object({
  notes: z.array(syncPushItemSchema).max(200),
});

export type AuthRequestInput = z.infer<typeof authRequestSchema>;
export type NoteInputParsed = z.infer<typeof noteInputSchema>;
export type SyncPushItemParsed = z.infer<typeof syncPushItemSchema>;

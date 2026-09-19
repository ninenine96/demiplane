/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  APP_NAME: string;
  AUTH_DEV_MODE?: string;
  OWNER_EMAIL?: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
}

/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  APP_NAME: string;
  AUTH_DEV_MODE?: string;
  OWNER_EMAIL?: string;
  /** Comma-separated extra addresses allowed to sign in (e.g. a UAT tester). */
  ALLOWED_EMAILS?: string;
  /** Cloudflare Email Sending binding ("send_email" in wrangler.jsonc). */
  EMAIL?: SendEmail;
  /** Sender address and display name on the app's sending subdomain. */
  EMAIL_FROM_ADDRESS?: string;
  EMAIL_FROM_NAME?: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
}

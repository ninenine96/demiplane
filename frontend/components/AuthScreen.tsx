import { useState, type FormEvent } from "react";
import { FLAVOUR, PLAIN } from "../../shared/messages";
import { Button, StatusLine } from "./ui";

interface AuthScreenProps {
  pendingToken: string | null;
  onSubmit: (email: string) => Promise<{ devLink?: string }>;
  onConfirm: (token: string, remember: boolean) => Promise<void>;
}

export function AuthScreen({
  pendingToken,
  onSubmit,
  onConfirm,
}: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [remember, setRemember] = useState(true);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorPlain, setErrorPlain] = useState<string>(PLAIN.authError);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(email);
      setDevLink(result.devLink ?? null);
      setSent(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : FLAVOUR.errorGeneric,
      );
      setErrorPlain(
        submitError instanceof Error ? submitError.message : PLAIN.authError,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!pendingToken) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(pendingToken, remember);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : FLAVOUR.invalidSendingStone,
      );
      setErrorPlain(
        confirmError instanceof Error
          ? confirmError.message
          : PLAIN.authError,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-void-900/70 p-8 shadow-2xl backdrop-blur">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-gold-500">
          Demiplane
        </p>
        <h1 className="font-serif text-2xl text-parchment-100">
          {pendingToken ? FLAVOUR.confirmLogin : FLAVOUR.loginPrompt}
        </h1>

        {pendingToken ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-relaxed text-parchment-300">
              A sending stone found its way here. Seal the portal to enter your
              pocket dimension.
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-void-950/50 p-3">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-arcane-500)]"
              />
              <span className="text-sm">
                <span className="block text-parchment-100">
                  {FLAVOUR.rememberLocation}
                </span>
                <span className="mt-0.5 block text-xs text-parchment-500">
                  {FLAVOUR.rememberLocationHint}
                </span>
              </span>
            </label>
            <Button onClick={handleConfirm} disabled={busy} className="w-full">
              {busy ? FLAVOUR.loading : FLAVOUR.confirmLogin}
            </Button>
          </div>
        ) : sent ? (
          <div className="mt-6 space-y-4">
            <StatusLine
              flavour={FLAVOUR.magicLinkSent}
              plain={FLAVOUR.magicLinkSentPlain}
              tone="success"
            />
            {devLink ? (
              <a
                href={devLink}
                className="block break-all rounded-lg border border-arcane-500/40 bg-arcane-500/10 p-3 text-xs text-arcane-300 hover:bg-arcane-500/20"
              >
                {devLink}
              </a>
            ) : null}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSent(false);
                setDevLink(null);
              }}
            >
              Use a different address
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm text-parchment-300" htmlFor="email">
              Keeper&apos;s email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/10 bg-void-950/60 px-3 py-2 text-parchment-100 outline-none focus:border-arcane-400"
            />
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? FLAVOUR.loading : FLAVOUR.loginButton}
            </Button>
          </form>
        )}

        {error ? (
          <div className="mt-4">
            <StatusLine flavour={error} plain={errorPlain} tone="error" />
          </div>
        ) : null}
      </div>
    </main>
  );
}

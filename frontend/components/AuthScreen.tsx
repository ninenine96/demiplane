import { useState, type FormEvent } from "react";
import { FLAVOUR, PLAIN } from "../../shared/messages";
import { Button, StatusLine } from "./ui";

interface AuthScreenProps {
  requestCode: (email: string) => Promise<{ devCode?: string }>;
  verifyCode: (
    email: string,
    code: string,
    remember: boolean,
  ) => Promise<void>;
}

type Step = "email" | "code";

export function AuthScreen({ requestCode, verifyCode }: AuthScreenProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorPlain, setErrorPlain] = useState<string>(PLAIN.authError);

  function fail(cause: unknown, fallbackFlavour: string) {
    setError(cause instanceof Error ? cause.message : fallbackFlavour);
    setErrorPlain(cause instanceof Error ? cause.message : PLAIN.authError);
  }

  async function handleRequestEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await requestCode(email.trim());
      setDevCode(result.devCode ?? null);
      if (result.devCode) setCode(result.devCode);
      setStep("code");
    } catch (cause) {
      fail(cause, FLAVOUR.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email.trim(), code.trim(), remember);
    } catch (cause) {
      fail(cause, FLAVOUR.codeInvalid);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setError(null);
    try {
      const result = await requestCode(email.trim());
      setDevCode(result.devCode ?? null);
      if (result.devCode) setCode(result.devCode);
    } catch (cause) {
      fail(cause, FLAVOUR.authRateLimited);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="flex min-h-[100dvh] items-center justify-center px-4 py-8"
      style={{
        paddingTop: "calc(2rem + var(--safe-top))",
        paddingBottom: "calc(2rem + var(--safe-bottom))",
      }}
    >
      <div className="animate-fade-in-up w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-void-700)] border-t-gold-500/40 bg-void-900 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)] sm:p-8">
        <p className="wordmark mb-3 inline-block font-display text-[0.6875rem] uppercase tracking-[0.28em] text-gold-400">
          Demiplane
        </p>

        {step === "email" ? (
          <>
            <h1 className="text-xl font-semibold text-parchment-100 sm:text-2xl">
              {FLAVOUR.loginPrompt}
            </h1>
            <form onSubmit={handleRequestEmail} className="mt-6 space-y-4">
              <label className="block text-sm text-parchment-300" htmlFor="email">
                Keeper&apos;s email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-[var(--radius-control)] border border-[var(--color-void-600)] bg-void-950/70 px-3 text-base text-parchment-100 outline-none transition-colors focus:border-gold-500/60"
              />
              <Button
                type="submit"
                disabled={busy}
                className="btn-bloom w-full"
              >
                {busy ? FLAVOUR.loading : FLAVOUR.loginButton}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-parchment-100 sm:text-2xl">
              {FLAVOUR.codePrompt}
            </h1>
            <p className="mt-2 text-sm text-parchment-500">
              {FLAVOUR.codeSent}{" "}
              <span className="sr-only">{FLAVOUR.codeSentPlain}</span>
            </p>

            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              <label className="block text-sm text-parchment-300" htmlFor="code">
                Sigil
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                className="h-12 w-full rounded-[var(--radius-control)] border border-[var(--color-void-600)] bg-void-950/70 px-3 text-center font-mono text-2xl tracking-[0.5em] text-parchment-100 outline-none transition-colors focus:border-gold-500/60"
              />

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-void-700)] bg-void-950/50 p-3">
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

              <Button
                type="submit"
                disabled={busy || code.length < 6}
                className="btn-bloom w-full"
              >
                {busy ? FLAVOUR.loading : FLAVOUR.confirmLogin}
              </Button>
            </form>

            {devCode ? (
              <div className="mt-4 break-all rounded-lg border border-gold-500/40 bg-gold-400/10 p-3 text-xs text-gold-300">
                Dev sigil: <span className="font-mono tracking-widest">{devCode}</span>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                className="text-parchment-500 transition-colors hover:text-parchment-100"
              >
                Use a different address
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={busy}
                className="text-parchment-500 transition-colors hover:text-gold-300 disabled:opacity-50"
              >
                {FLAVOUR.resendCode}
              </button>
            </div>
          </>
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

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Trash2, X } from "lucide-react";
import { FLAVOUR, PLAIN } from "../../shared/messages";
import type { ApiToken, ApiTokenCreated } from "../../shared/types";
import { api } from "../lib/api";
import { Button, cx, Input, StatusLine } from "./ui";

function when(ms: number | null): string {
  return ms ? new Date(ms * 1000).toLocaleString() : FLAVOUR.agentKeyNever;
}

export function AgentKeysDialog({ onClose }: { onClose: () => void }) {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState<string>(FLAVOUR.agentKeyFolderDefault);
  const [forging, setForging] = useState(false);
  const [fresh, setFresh] = useState<ApiTokenCreated | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTokens(await api.listTokens());
      setError(null);
    } catch {
      setError(FLAVOUR.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function forge() {
    const label = name.trim();
    if (!label || forging) return;
    setForging(true);
    try {
      const created = await api.createToken({
        name: label,
        folder: folder.trim() || null,
      });
      setFresh(created);
      setCopied(false);
      setName("");
      await load();
    } catch {
      setError(FLAVOUR.errorGeneric);
    } finally {
      setForging(false);
    }
  }

  async function breakKey(id: string) {
    if (!window.confirm(FLAVOUR.agentKeyRevokeConfirm)) return;
    try {
      await api.revokeToken(id);
      await load();
    } catch {
      setError(FLAVOUR.errorGeneric);
    }
  }

  async function copy() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.token);
      setCopied(true);
    } catch {
      setError(FLAVOUR.errorGeneric);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={FLAVOUR.agentKeys}
      onMouseDown={onClose}
      className="animate-fade-in-up fixed inset-0 z-[60] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="animate-pop-in flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-void-700)] border-t-gold-500/40 bg-void-900 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-4">
          <div className="flex items-start gap-3">
            <KeyRound
              size={18}
              className="mt-0.5 shrink-0 text-gold-400"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-base font-semibold text-gold-300">
                {FLAVOUR.agentKeys}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-parchment-500">
                {FLAVOUR.agentKeysHint}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-parchment-100"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {fresh ? (
            <div className="mb-4 rounded-[var(--radius-card)] border border-gold-500/40 bg-gold-400/[0.06] p-3">
              <p className="text-xs text-gold-200">
                {FLAVOUR.agentKeyCreated}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border border-[var(--color-void-600)] bg-void-950/80 px-2 py-1.5 font-mono text-xs text-parchment-100">
                  {fresh.token}
                </code>
                <Button
                  size="sm"
                  variant={copied ? "ghost" : "gold"}
                  icon={copied ? <Check size={14} /> : <Copy size={14} />}
                  onClick={() => void copy()}
                >
                  {copied ? FLAVOUR.agentKeyCopied : FLAVOUR.agentKeyCopy}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-[var(--radius-card)] border border-[var(--color-void-700)] p-3">
            <p className="text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500">
              {FLAVOUR.agentKeyNew}
            </p>
            <div className="mt-2 space-y-2">
              <label className="block">
                <span className="sr-only">{FLAVOUR.agentKeyName}</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={FLAVOUR.agentKeyNamePlaceholder}
                  aria-label={FLAVOUR.agentKeyName}
                  maxLength={100}
                />
              </label>
              <label className="block">
                <span className="sr-only">{FLAVOUR.agentKeyFolder}</span>
                <Input
                  value={folder}
                  onChange={(event) => setFolder(event.target.value)}
                  placeholder={FLAVOUR.agentKeyFolder}
                  aria-label={FLAVOUR.agentKeyFolder}
                  maxLength={300}
                />
              </label>
              <p className="text-[0.6875rem] text-parchment-500">
                {FLAVOUR.agentKeyFolderHint}
              </p>
              <Button
                block
                icon={<KeyRound size={15} />}
                disabled={!name.trim() || forging}
                onClick={() => void forge()}
              >
                {FLAVOUR.agentKeyForge}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-3">
              <StatusLine flavour={error} plain={PLAIN.keyError} tone="error" />
            </div>
          ) : null}

          <div className="mt-4 pb-5">
            <p className="text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500">
              {FLAVOUR.agentKeys}
            </p>
            {loading ? (
              <div className="mt-2">
                <StatusLine
                  flavour={FLAVOUR.loading}
                  plain={PLAIN.keysLoading}
                />
              </div>
            ) : tokens.length === 0 ? (
              <p className="mt-2 text-sm text-parchment-500">
                {FLAVOUR.agentKeyNone}
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {tokens.map((token) => (
                  <li
                    key={token.id}
                    className={cx(
                      "flex items-center justify-between gap-3 rounded-lg border border-[var(--color-void-700)] px-3 py-2",
                      token.revokedAt ? "opacity-50" : "",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-parchment-100">
                        {token.name}
                      </p>
                      <p className="truncate text-[0.6875rem] text-parchment-500">
                        {token.folder ? `${token.folder} · ` : ""}
                        {FLAVOUR.agentKeyLastUsed} {when(token.lastUsedAt)}
                        {" · "}
                        {FLAVOUR.agentKeyForgedAt} {when(token.createdAt)}
                      </p>
                    </div>
                    {token.revokedAt ? (
                      <span className="shrink-0 text-[0.6875rem] uppercase tracking-[0.14em] text-ember-400">
                        {FLAVOUR.agentKeyBroken}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void breakKey(token.id)}
                        aria-label={FLAVOUR.agentKeyRevoke}
                        title={FLAVOUR.agentKeyRevoke}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-parchment-500 transition-colors hover:bg-ember-400/10 hover:text-ember-400"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

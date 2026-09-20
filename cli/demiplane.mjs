#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DEFAULT_URL = "https://demiplane.prohan.workers.dev";
const DEFAULT_FOLDER = "Agent Memory";
const CONFIG_PATH = join(homedir(), ".config", "demiplane", "config.json");
const VALUE_FLAGS = new Set(["title", "folder", "tag", "url", "token"]);

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split("=");
      if (inline !== undefined) {
        options[key] = inline;
      } else if (VALUE_FLAGS.has(key)) {
        options[key] = argv[(i += 1)];
      } else {
        options[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { options, positional };
}

function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function resolve(options) {
  const config = loadConfig();
  return {
    url: options.url || process.env.DEMIPLANE_URL || config.url || DEFAULT_URL,
    token: options.token || process.env.DEMIPLANE_TOKEN || config.token || "",
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function call({ url, token }, path, init = {}) {
  if (!token) {
    throw new Error(
      "No key found. Set DEMIPLANE_TOKEN, pass --token, or run: demiplane config --token <key>",
    );
  }
  const response = await fetch(new URL(path, url), {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(
      body?.messagePlain || body?.error || `HTTP ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  return body?.data ?? body;
}

function firstLine(text) {
  const line = text.split("\n").find((candidate) => candidate.trim()) ?? "";
  return line.trim().slice(0, 80);
}

function tagsOf(options) {
  if (!options.tag) return [];
  return String(options.tag)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

const USAGE = `demiplane — talk to your pocket dimension

Usage:
  demiplane save "text" [--title T] [--folder SATCHEL] [--tag a,b]
  demiplane list [--folder SATCHEL]
  demiplane search <query>
  demiplane get <id>
  demiplane rm <id>
  demiplane whoami
  demiplane config --token <key> [--url URL]

Reads DEMIPLANE_TOKEN / DEMIPLANE_URL, or ~/.config/demiplane/config.json.
Writes default to the satchel "${DEFAULT_FOLDER}".`;

async function main() {
  const { options, positional } = parseArgs(process.argv.slice(2));
  const command = positional[0] ?? "help";
  const args = positional.slice(1);
  const target = resolve(options);

  if (command === "help" || options.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  if (command === "config") {
    const config = loadConfig();
    if (options.url) config.url = options.url;
    if (options.token) config.token = options.token;
    mkdirSync(dirname(CONFIG_PATH), { recursive: true });
    writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, {
      mode: 0o600,
    });
    process.stdout.write(`${CONFIG_PATH}\n`);
    return;
  }

  if (command === "save") {
    let text = args.join(" ").trim();
    if (!text) text = (await readStdin()).trim();
    if (!text) throw new Error("Nothing to inscribe. Pass text or pipe it in.");
    const note = await call(target, "/api/notes", {
      method: "POST",
      body: JSON.stringify({
        title: options.title || firstLine(text),
        body: text,
        folder: options.folder ?? DEFAULT_FOLDER,
        tags: tagsOf(options),
      }),
    });
    process.stdout.write(`${JSON.stringify(note, null, 2)}\n`);
    return;
  }

  if (command === "list") {
    const notes = await call(target, "/api/notes");
    const filtered = options.folder
      ? notes.filter((note) => (note.folder ?? "") === options.folder)
      : notes;
    process.stdout.write(`${JSON.stringify(filtered, null, 2)}\n`);
    return;
  }

  if (command === "search") {
    const query = args.join(" ").trim().toLowerCase();
    if (!query) throw new Error("Give a phrase to scry for.");
    const payload = await call(target, "/api/sync/pull?since=0");
    const matches = (payload.changes ?? [])
      .map((change) => change.note)
      .filter((note) => !note.deleted)
      .filter((note) =>
        `${note.title} ${note.folder ?? ""} ${note.tags.join(" ")} ${note.body}`
          .toLowerCase()
          .includes(query),
      );
    process.stdout.write(`${JSON.stringify(matches, null, 2)}\n`);
    return;
  }

  if (command === "get") {
    if (!args[0]) throw new Error("Which page? Give an id.");
    const note = await call(target, `/api/notes/${encodeURIComponent(args[0])}`);
    process.stdout.write(`${JSON.stringify(note, null, 2)}\n`);
    return;
  }

  if (command === "rm") {
    if (!args[0]) throw new Error("Which page? Give an id.");
    const note = await call(target, `/api/notes/${encodeURIComponent(args[0])}`, {
      method: "DELETE",
    });
    process.stdout.write(`${JSON.stringify(note, null, 2)}\n`);
    return;
  }

  if (command === "whoami") {
    const me = await call(target, "/api/me");
    process.stdout.write(`${JSON.stringify(me, null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown working: ${command}\n\n${USAGE}`);
}

main().catch((error) => {
  process.stderr.write(`demiplane: ${error.message}\n`);
  process.exit(1);
});

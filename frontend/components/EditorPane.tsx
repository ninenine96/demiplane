import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { FLAVOUR, PLAIN } from "../../shared/messages";
import type { Attachment } from "../../shared/types";
import type { LocalNote } from "../db/dexie";
import { api } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { Button, StatusLine } from "./ui";

interface EditorPaneProps {
  note: LocalNote | undefined;
  onSave: (
    id: string,
    patch: Partial<Pick<LocalNote, "title" | "body" | "folder" | "tags" | "deleted">>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUndelete: (id: string) => Promise<void>;
}

export function EditorPane({
  note,
  onSave,
  onDelete,
  onUndelete,
}: EditorPaneProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setBody(note.body);
    setFolder(note.folder ?? "");
    setTags(note.tags.join(", "));
  }, [note?.id]);

  useEffect(() => {
    if (!note?.id) {
      setAttachments([]);
      return;
    }
    let cancelled = false;
    api
      .listAttachments(note.id)
      .then((list) => {
        if (!cancelled) setAttachments(list);
      })
      .catch(() => {
        if (!cancelled) setAttachments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [note?.id]);

  async function handleFiles(files: FileList | null) {
    if (!note || !files || files.length === 0) return;
    setUploading(true);
    const uploaded: Attachment[] = [];
    let snippet = "";
    for (const file of Array.from(files)) {
      try {
        const attachment = await api.uploadAttachment(note.id, file);
        uploaded.push(attachment);
        const isImage = (attachment.contentType ?? "").startsWith("image/");
        snippet += isImage
          ? `\n![${attachment.filename}](${attachment.url})\n`
          : `\n[${attachment.filename}](${attachment.url})\n`;
      } catch {
        // Individual failures are surfaced by the status line below.
      }
    }
    setUploading(false);
    if (uploaded.length > 0) {
      setAttachments((current) => [...current, ...uploaded]);
      const nextBody = `${body}${snippet}`;
      setBody(nextBody);
      scheduleSave({ body: nextBody });
    }
  }

  async function removeAttachment(id: string) {
    try {
      await api.deleteAttachment(id);
      setAttachments((current) => current.filter((item) => item.id !== id));
    } catch {
      // Nothing we can do locally; the item stays listed.
    }
  }

  function scheduleSave(
    patch: Partial<Pick<LocalNote, "title" | "body" | "folder" | "tags">>,
  ) {
    const id = note?.id;
    if (!id) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void onSave(id, patch);
    }, 600);
  }

  if (!note) {
    return (
      <section className="flex h-full items-center justify-center border-l border-white/5 text-center">
        <div className="max-w-sm px-6">
          <p className="font-serif text-xl text-gold-400">
            {FLAVOUR.emptyNotes}
          </p>
          <p className="mt-2 text-sm text-parchment-500">
            {FLAVOUR.newNote}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`flex h-full min-w-0 flex-col border-l border-white/5 ${
        dragging ? "ring-2 ring-inset ring-arcane-400/60" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void handleFiles(event.dataTransfer.files);
      }}
    >
      <header className="space-y-3 border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <input
            aria-label="Note title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              scheduleSave({ title: event.target.value });
            }}
            placeholder={FLAVOUR.noteTitlePlaceholder}
            className="min-w-0 flex-1 bg-transparent font-serif text-2xl text-parchment-100 outline-none placeholder:text-parchment-500/60"
          />
          <Button
            variant="ghost"
            onClick={() => setShowPreview((value) => !value)}
            aria-pressed={showPreview}
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </Button>
          {note.deleted ? (
            <Button variant="ghost" onClick={() => void onUndelete(note.id)}>
              {FLAVOUR.undelete}
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => {
                if (
                  window.confirm(
                    `${FLAVOUR.deleteConfirm}\n\n${FLAVOUR.deleteConfirmBody}`,
                  )
                ) {
                  void onDelete(note.id);
                }
              }}
            >
              Banish
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-2 text-parchment-500">
            Satchel
            <input
              value={folder}
              onChange={(event) => {
                setFolder(event.target.value);
                scheduleSave({ folder: event.target.value || null });
              }}
              placeholder="Work/Projects"
              className="rounded-md border border-white/10 bg-void-950/60 px-2 py-1 text-parchment-100 outline-none focus:border-arcane-400"
            />
          </label>
          <label className="flex min-w-[12rem] flex-1 items-center gap-2 text-parchment-500">
            Sigils
            <input
              value={tags}
              onChange={(event) => {
                setTags(event.target.value);
                scheduleSave({
                  tags: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                });
              }}
              placeholder="ideas, work, arcane"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-void-950/60 px-2 py-1 text-parchment-100 outline-none focus:border-arcane-400"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? FLAVOUR.attachmentUpload : "Tuck into the Haversack"}
          </Button>
          {attachments.length > 0 ? (
            <span className="text-parchment-500">
              {attachments.length} trinket{attachments.length === 1 ? "" : "s"} stowed
            </span>
          ) : null}
        </div>

        {attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {attachments.map((attachment) => {
              const isImage = (attachment.contentType ?? "").startsWith(
                "image/",
              );
              return (
                <li
                  key={attachment.id}
                  className="group flex items-center gap-2 rounded-lg border border-white/10 bg-void-950/50 px-2 py-1 text-xs"
                >
                  {isImage ? (
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 items-center justify-center rounded bg-white/5 text-[10px] uppercase text-parchment-500"
                    >
                      {(attachment.filename.split(".").pop() ?? "?").slice(0, 4)}
                    </span>
                  )}
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="max-w-[10rem] truncate text-parchment-300 hover:text-parchment-100"
                  >
                    {attachment.filename}
                  </a>
                  <button
                    onClick={() => void removeAttachment(attachment.id)}
                    aria-label={`Remove ${attachment.filename}`}
                    className="text-parchment-500 hover:text-red-300"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {uploading ? (
          <StatusLine
            flavour={FLAVOUR.attachmentUpload}
            plain={PLAIN.attachmentUploading}
          />
        ) : null}
      </header>

      {note.deleted ? (
        <div
          role="status"
          className="border-b border-red-500/20 bg-red-950/30 px-5 py-2 text-xs text-red-200"
        >
          {FLAVOUR.deleteDone}{" "}
          <span className="sr-only">This note is in the trash.</span>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="min-h-0 overflow-hidden border-white/5 lg:border-r">
          <CodeMirror
            value={body}
            height="100%"
            extensions={[
              markdown({ base: markdownLanguage }),
              EditorView.lineWrapping,
            ]}
            basicSetup={{ lineNumbers: false, foldGutter: false }}
            onChange={(value) => {
              setBody(value);
              scheduleSave({ body: value });
            }}
            placeholder={FLAVOUR.editorPlaceholder}
          />
        </div>
        {showPreview ? (
          <div className="prose-arcane min-h-0 overflow-y-auto px-6 py-5 leading-relaxed">
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
            />
            {body.trim() === "" ? (
              <p className="text-sm text-parchment-500 italic">
                {PLAIN.idle} Nothing to preview yet.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Paperclip,
  Trash2,
  Undo2,
} from "lucide-react";
import { FLAVOUR, PLAIN } from "../../shared/messages";
import type { Attachment } from "../../shared/types";
import type { LocalNote } from "../db/dexie";
import { api } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { Button, cx, IconButton, StatusLine } from "./ui";

interface EditorPaneProps {
  note: LocalNote | undefined;
  onSave: (
    id: string,
    patch: Partial<Pick<LocalNote, "title" | "body" | "folder" | "tags" | "deleted">>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUndelete: (id: string) => Promise<void>;
  onBack: () => void;
  onNew: () => void;
}

function prefersDesktopPreview(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function EditorPane({
  note,
  onSave,
  onDelete,
  onUndelete,
  onBack,
  onNew,
}: EditorPaneProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState("");
  const [showPreview, setShowPreview] = useState(prefersDesktopPreview);
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

  if (!note) {
    return (
      <section className="flex h-full items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className="font-display text-xl text-gold-400">
            {FLAVOUR.emptyNotes}
          </p>
          <p className="mt-2 text-sm text-parchment-500">{FLAVOUR.newNote}</p>
          <Button
            className="mt-5"
            onClick={onNew}
            icon={<Paperclip size={16} />}
          >
            {FLAVOUR.newNote}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cx(
        "flex h-full min-w-0 flex-col bg-void-900/20",
        dragging && "ring-2 ring-inset ring-arcane-400/60",
      )}
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
      <header
        className="border-b border-[var(--color-void-700)] bg-void-900/70 backdrop-blur"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
          <IconButton
            label={FLAVOUR.backToArchives}
            onClick={onBack}
            className="lg:hidden"
          >
            <ArrowLeft size={18} />
          </IconButton>
          <input
            aria-label="Note title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              scheduleSave({ title: event.target.value });
            }}
            placeholder={FLAVOUR.noteTitlePlaceholder}
            className="min-w-0 flex-1 bg-transparent px-0 font-display text-lg text-parchment-100 outline-none placeholder:text-parchment-500/70 sm:text-xl"
          />
          <IconButton
            label={showPreview ? FLAVOUR.previewHide : FLAVOUR.previewShow}
            onClick={() => setShowPreview((value) => !value)}
            variant={showPreview ? "ghost" : "ghost"}
          >
            {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
          </IconButton>
          {note.deleted ? (
            <IconButton
              label={FLAVOUR.undelete}
              variant="gold"
              onClick={() => void onUndelete(note.id)}
            >
              <Undo2 size={18} />
            </IconButton>
          ) : (
            <IconButton
              label={FLAVOUR.deleteConfirm}
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
              <Trash2 size={18} />
            </IconButton>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-3 pb-3 text-xs sm:px-4">
          <label className="flex items-center gap-2 text-parchment-500">
            <span className="sr-only sm:not-sr-only">Satchel</span>
            <input
              value={folder}
              onChange={(event) => {
                setFolder(event.target.value);
                scheduleSave({ folder: event.target.value || null });
              }}
              placeholder={FLAVOUR.folderNew}
              className="h-8 w-32 rounded-lg border border-[var(--color-void-700)] bg-void-950/60 px-2 text-parchment-100 outline-none focus:border-arcane-400 sm:w-44"
            />
          </label>
          <label className="flex min-w-[10rem] flex-1 items-center gap-2 text-parchment-500">
            <span className="sr-only sm:not-sr-only">Sigils</span>
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
              placeholder={FLAVOUR.tagNew}
              className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--color-void-700)] bg-void-950/60 px-2 text-parchment-100 outline-none focus:border-arcane-400"
            />
          </label>
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
            size="sm"
            icon={<Paperclip size={15} />}
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            <span className="hidden sm:inline">
              {uploading ? FLAVOUR.attachmentUpload : "Tuck into the Haversack"}
            </span>
            <span className="sm:hidden">Stow</span>
          </Button>
        </div>

        {attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-2 px-3 pb-3 sm:px-4">
            {attachments.map((attachment) => {
              const isImage = (attachment.contentType ?? "").startsWith(
                "image/",
              );
              return (
                <li
                  key={attachment.id}
                  className="group flex items-center gap-2 rounded-lg border border-[var(--color-void-700)] bg-void-950/50 px-2 py-1 text-xs"
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
                  <IconButton
                    label={`Remove ${attachment.filename}`}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => void removeAttachment(attachment.id)}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        ) : null}

        {uploading ? (
          <div className="px-3 pb-2 sm:px-4">
            <StatusLine
              flavour={FLAVOUR.attachmentUpload}
              plain={PLAIN.attachmentUploading}
            />
          </div>
        ) : null}
      </header>

      {note.deleted ? (
        <div
          role="status"
          className="border-b border-ember-400/20 bg-ember-400/10 px-4 py-2 text-xs text-ember-400"
        >
          {FLAVOUR.deleteDone}{" "}
          <span className="sr-only">This note is in the trash.</span>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div
          className={cx(
            "h-full min-w-0 flex-1",
            showPreview && "hidden lg:block",
          )}
          data-color-mode="dark"
        >
          <MDEditor
            value={body}
            onChange={(value) => {
              const next = value ?? "";
              setBody(next);
              scheduleSave({ body: next });
            }}
            preview="edit"
            height="100%"
            visibleDragbar={false}
            textareaProps={{ "aria-label": "Note body" }}
            style={{ height: "100%" }}
          />
        </div>

        {showPreview ? (
          <div className="min-h-0 flex-1 overflow-y-auto border-l border-[var(--color-void-700)] px-5 py-6 sm:px-8 lg:max-w-[50%]">
            <div
              className="prose-arcane max-w-3xl"
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

import { useEffect, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Paperclip,
  Plus,
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
        <div className="max-w-sm space-y-3">
          <p className="text-lg font-medium text-parchment-100">
            {FLAVOUR.emptyNotes}
          </p>
          <p className="text-sm text-parchment-500">{FLAVOUR.newNote}</p>
          <Button className="mt-1" onClick={onNew} icon={<Plus size={16} />}>
            {FLAVOUR.newNote}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cx(
        "flex h-full min-w-0 flex-col bg-void-950/40",
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
        className="space-y-3 border-b border-[var(--color-void-700)] bg-void-900 px-4 py-3 sm:px-5"
        style={{ paddingTop: "calc(0.75rem + var(--safe-top))" }}
      >
        <div className="flex items-center gap-1">
          <IconButton
            label={FLAVOUR.backToArchives}
            size="sm"
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
            className="min-w-0 flex-1 bg-transparent px-1 text-base font-semibold text-parchment-100 outline-none placeholder:font-normal placeholder:text-parchment-500/70 sm:text-lg"
          />
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
          <IconButton
            label="Tuck into the Haversack"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            <Paperclip size={17} />
          </IconButton>
          <IconButton
            label={showPreview ? FLAVOUR.previewHide : FLAVOUR.previewShow}
            size="sm"
            onClick={() => setShowPreview((value) => !value)}
          >
            {showPreview ? <EyeOff size={17} /> : <Eye size={17} />}
          </IconButton>
          {note.deleted ? (
            <IconButton
              label={FLAVOUR.undelete}
              size="sm"
              variant="gold"
              onClick={() => void onUndelete(note.id)}
            >
              <Undo2 size={17} />
            </IconButton>
          ) : (
            <IconButton
              label={FLAVOUR.deleteConfirm}
              size="sm"
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
              <Trash2 size={17} />
            </IconButton>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={folder}
            onChange={(event) => {
              setFolder(event.target.value);
              scheduleSave({ folder: event.target.value || null });
            }}
            placeholder={FLAVOUR.folderNew}
            aria-label="Satchel"
            className="h-9 w-full rounded-[var(--radius-control)] border border-[var(--color-void-700)] bg-void-950/60 px-3 text-sm text-parchment-100 outline-none transition-colors focus:border-arcane-400 sm:w-44"
          />
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
            aria-label="Sigils"
            className="h-9 w-full min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--color-void-700)] bg-void-950/60 px-3 text-sm text-parchment-100 outline-none transition-colors focus:border-arcane-400"
          />
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
                  className="flex items-center gap-2 rounded-lg border border-[var(--color-void-700)] bg-void-950/50 py-1 pl-1.5 pr-1 text-xs"
                >
                  {isImage ? (
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="h-7 w-7 rounded object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 items-center justify-center rounded bg-white/5 text-[10px] uppercase text-parchment-500"
                    >
                      {(attachment.filename.split(".").pop() ?? "?").slice(0, 4)}
                    </span>
                  )}
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="max-w-[9rem] truncate text-parchment-300 hover:text-parchment-100"
                  >
                    {attachment.filename}
                  </a>
                  <IconButton
                    label={`Remove ${attachment.filename}`}
                    size="sm"
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
          <StatusLine
            flavour={FLAVOUR.attachmentUpload}
            plain={PLAIN.attachmentUploading}
          />
        ) : null}
      </header>

      {note.deleted ? (
        <div
          role="status"
          className="border-b border-ember-400/20 bg-ember-400/10 px-4 py-2.5 text-xs text-ember-400"
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
              className="prose-arcane mx-auto max-w-3xl"
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

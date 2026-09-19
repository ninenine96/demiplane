import { useEffect, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  MoreHorizontal,
  Paperclip,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { FLAVOUR, PLAIN } from "../../shared/messages";
import type { Attachment } from "../../shared/types";
import type { LocalNote } from "../db/dexie";
import type { SyncStatus } from "../sync/engine";
import { api } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { SyncDot } from "./SyncBadge";
import {
  Button,
  IconButton,
  Menu,
  MenuDivider,
  MenuItem,
  MenuLabel,
  StatusLine,
  cx,
} from "./ui";

interface EditorPaneProps {
  note: LocalNote | undefined;
  syncStatus: SyncStatus;
  onSave: (
    id: string,
    patch: Partial<Pick<LocalNote, "title" | "body" | "folder" | "tags" | "deleted">>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUndelete: (id: string) => Promise<void>;
  onSync: () => void;
  onBack: () => void;
  onNew: () => void;
}

export function EditorPane({
  note,
  syncStatus,
  onSave,
  onDelete,
  onUndelete,
  onSync,
  onBack,
  onNew,
}: EditorPaneProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState("");
  const [showPreview, setShowPreview] = useState(false);
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

  useEffect(() => {
    function applyWrap(before: string, after: string) {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        ".w-md-editor-text-input",
      );
      if (!textarea) return;
      const { selectionStart, selectionEnd, value } = textarea;
      const start = selectionStart ?? value.length;
      const end = selectionEnd ?? start;
      const selected = value.slice(start, end);
      const next =
        value.slice(0, start) + before + selected + after + value.slice(end);
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(textarea, next);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      const caret = start + before.length + selected.length;
      requestAnimationFrame(() => textarea.setSelectionRange(caret, caret));
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();

      if (key === "e") {
        event.preventDefault();
        setShowPreview((value) => !value);
        return;
      }

      const map: Record<string, [string, string]> = {
        b: ["**", "**"],
        i: ["*", "*"],
        k: ["[", "](url)"],
      };
      const wrap = map[key];
      if (!wrap) return;
      const active = document.activeElement;
      if (!(active instanceof HTMLTextAreaElement)) return;
      if (!active.classList.contains("w-md-editor-text-input")) return;
      event.preventDefault();
      applyWrap(wrap[0], wrap[1]);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
        <div className="animate-fade-in-up max-w-md space-y-6">
          <div className="portal" aria-hidden="true">
            <span className="portal-ring" />
            <span className="portal-ring-inner" />
          </div>
          <div className="space-y-2">
            <p className="font-display text-lg tracking-wide text-gold-300">
              {FLAVOUR.emptyNotes}
            </p>
            <p className="text-sm text-parchment-500">{FLAVOUR.newNote}</p>
          </div>
          <Button className="btn-bloom" onClick={onNew} icon={<Plus size={16} />}>
            {FLAVOUR.newNote}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cx(
        "relative flex h-full min-w-0 flex-col",
        dragging && "ring-2 ring-inset ring-gold-400/50",
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
        className="flex items-center gap-1 px-3 py-2 sm:px-5"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
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
          className="min-w-0 flex-1 bg-transparent px-1 font-serif text-lg font-medium text-parchment-100 outline-none placeholder:font-normal placeholder:text-parchment-500/60 sm:text-xl"
        />
        <SyncDot status={syncStatus} onSync={onSync} />
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
        <Menu label="Page" trigger={<MoreHorizontal size={17} />} panelClassName="w-80">
          {(close) => (
            <>
              <MenuItem
                icon={showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                onClick={() => {
                  setShowPreview((value) => !value);
                  close();
                }}
              >
                {showPreview ? FLAVOUR.previewHide : FLAVOUR.previewShow}
              </MenuItem>

              <MenuDivider />
              <MenuLabel>Satchel</MenuLabel>
              <div className="px-2 pb-1">
                <input
                  value={folder}
                  onChange={(event) => {
                    setFolder(event.target.value);
                    scheduleSave({ folder: event.target.value || null });
                  }}
                  placeholder={FLAVOUR.folderNew}
                  aria-label="Satchel"
                  className="h-9 w-full rounded-lg border border-[var(--color-void-700)] bg-void-950/60 px-3 text-sm text-parchment-100 outline-none focus:border-gold-500/50"
                />
              </div>

              <MenuLabel>Sigils</MenuLabel>
              <div className="px-2 pb-1">
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
                  className="h-9 w-full rounded-lg border border-[var(--color-void-700)] bg-void-950/60 px-3 text-sm text-parchment-100 outline-none focus:border-gold-500/50"
                />
              </div>

              {attachments.length > 0 ? (
                <>
                  <MenuLabel>Haversack</MenuLabel>
                  <ul className="flex flex-wrap gap-1.5 px-2 pb-1">
                    {attachments.map((attachment) => (
                      <li
                        key={attachment.id}
                        className="flex items-center gap-1.5 rounded-md border border-[var(--color-void-700)] bg-void-950/50 py-0.5 pl-1.5 pr-0.5 text-xs"
                      >
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="max-w-[8rem] truncate text-parchment-300 hover:text-parchment-100"
                        >
                          {attachment.filename}
                        </a>
                        <button
                          type="button"
                          aria-label={`Remove ${attachment.filename}`}
                          onClick={() => void removeAttachment(attachment.id)}
                          className="grid h-5 w-5 place-items-center rounded text-parchment-500 hover:text-ember-400"
                        >
                          <Trash2 size={12} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <MenuItem
                icon={<Paperclip size={15} />}
                onClick={() => {
                  fileInput.current?.click();
                  close();
                }}
              >
                Tuck into the Haversack
              </MenuItem>

              <MenuDivider />
              {note.deleted ? (
                <MenuItem
                  icon={<Undo2 size={15} />}
                  onClick={() => {
                    void onUndelete(note.id);
                    close();
                  }}
                >
                  {FLAVOUR.undelete}
                </MenuItem>
              ) : (
                <MenuItem
                  icon={<Trash2 size={15} />}
                  className="text-ember-400 hover:bg-ember-400/10 hover:text-ember-400"
                  onClick={() => {
                    if (
                      window.confirm(
                        `${FLAVOUR.deleteConfirm}\n\n${FLAVOUR.deleteConfirmBody}`,
                      )
                    ) {
                      void onDelete(note.id);
                    }
                    close();
                  }}
                >
                  {FLAVOUR.deleteConfirm}
                </MenuItem>
              )}
            </>
          )}
        </Menu>
      </header>

      {note.deleted ? (
        <div
          role="status"
          className="px-5 py-1.5 text-xs text-ember-400/90 sm:px-6"
        >
          {FLAVOUR.deleteDone}
        </div>
      ) : null}

      {uploading ? (
        <div className="px-5 pb-1 sm:px-6">
          <StatusLine
            flavour={FLAVOUR.attachmentUpload}
            plain={PLAIN.attachmentUploading}
          />
        </div>
      ) : null}

      <div key={note.id} className="animate-page-in min-h-0 flex-1 overflow-hidden">
        {showPreview ? (
          <div className="animate-fade-in-up h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-[44rem] px-6 py-10 sm:py-14">
              <div
                className="prose-arcane"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
              />
              {body.trim() === "" ? (
                <p className="text-sm italic text-parchment-500">
                  {PLAIN.idle} Nothing inscribed yet.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mx-auto h-full w-full max-w-[44rem] px-2 sm:px-6">
            <MDEditor
              value={body}
              onChange={(value) => {
                const next = value ?? "";
                setBody(next);
                scheduleSave({ body: next });
              }}
              preview="edit"
              hideToolbar
              visibleDragbar={false}
              height="100%"
              textareaProps={{
                "aria-label": "Note body",
                placeholder: FLAVOUR.editorPlaceholder,
              }}
              style={{ height: "100%", background: "transparent" }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

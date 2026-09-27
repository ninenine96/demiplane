import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import {
  ArrowLeft,
  BookPlus,
  Calendar,
  CalendarClock,
  Clock,
  Eye,
  EyeOff,
  Link2,
  ListChecks,
  MoreHorizontal,
  Plus,
  SpellCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { FLAVOUR, PLAIN } from "../../shared/messages";
import type { Attachment } from "../../shared/types";
import type { LocalNote } from "../db/dexie";
import type { SyncStatus } from "../sync/engine";
import { api } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { toggleTaskAt } from "../lib/checklist";
import { backlinksFor, resolveWikiLink } from "../lib/wikilinks";
import { countWords, readingMinutes } from "../lib/stats";
import {
  addToLexicon,
  isMisspelled,
  isProtectedSpan,
  protectedRanges,
  suggestionsFor,
  wikilinkAt,
  wordAt,
} from "../lib/spellcheck";
import type { WordSpan } from "../lib/spellcheck";
import { buildEditorExtensions } from "../lib/editor/setup";
import { formatStamp, formatTask } from "../lib/editor/format";
import { TASK_LINE } from "../lib/editor/tasks";
import { clearEditorBridge, setEditorBridge } from "../lib/editor/bridge";
import { ContextMenu, useContextMenu, type ContextMenuEntry } from "./ContextMenu";
import { SelectionToolbar } from "./SelectionToolbar";
import { SyncDot } from "./SyncBadge";
import {
  Button,
  Menu,
  MenuDivider,
  MenuItem,
  MenuLabel,
  StatusLine,
  cx,
} from "./ui";

interface EditorPaneProps {
  note: LocalNote | undefined;
  notes: LocalNote[];
  syncStatus: SyncStatus;
  focusMode: boolean;
  typewriterMode: boolean;
  onSave: (
    id: string,
    patch: Partial<Pick<LocalNote, "title" | "body" | "folder" | "tags" | "deleted">>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUndelete: (id: string) => Promise<void>;
  onSync: () => void;
  onBack: () => void;
  onNew: () => void;
  onSelectNote: (id: string) => void;
}

export function EditorPane({
  note,
  notes,
  syncStatus,
  focusMode,
  typewriterMode,
  onSave,
  onDelete,
  onUndelete,
  onSync,
  onBack,
  onNew,
  onSelectNote,
}: EditorPaneProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [missingLink, setMissingLink] = useState<string | null>(null);
  const [view, setView] = useState<EditorView | null>(null);

  const viewRef = useRef<EditorView | null>(null);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const pendingSave = useRef<Partial<
    Pick<LocalNote, "title" | "body" | "folder" | "tags">
  > | null>(null);
  const contextMenu = useContextMenu();

  // Keep the app-level command palette able to reach this canvas.
  useEffect(() => {
    if (!note?.id) return;
    const bridge = { getView: () => viewRef.current };
    setEditorBridge(bridge);
    return () => clearEditorBridge(bridge);
  }, [note?.id]);

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setBody(note.body);
    setFolder(note.folder ?? "");
    setTags(note.tags.join(", "));
  }, [note?.id]);

  // Auto-grow the title so long names wrap instead of scrolling sideways.
  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [title, note?.id]);

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
    if (!missingLink) return;
    const timer = window.setTimeout(() => setMissingLink(null), 3200);
    return () => window.clearTimeout(timer);
  }, [missingLink]);

  // The canvas unmounts while the page is veiled; drop the stale editor handle.
  useEffect(() => {
    if (!showPreview) return;
    viewRef.current = null;
    setView(null);
  }, [showPreview]);

  // Reveal / veil works even when the editor is not mounted (preview mode).
  // The CodeMirror keymap claims it while writing, setting `defaultPrevented`.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLowerCase() !== "e") return;
      event.preventDefault();
      setShowPreview((value) => !value);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Flush any pending save when switching pages or leaving the editor, so a
  // just-typed word is never lost to the draft cleanup.
  useEffect(() => () => flushSave(), [note?.id]);

  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const patch = pendingSave.current;
    pendingSave.current = null;
    const id = note?.id;
    if (patch && id) void onSave(id, patch);
  }, [note?.id, onSave]);

  const scheduleSave = useCallback(
    (
      patch: Partial<Pick<LocalNote, "title" | "body" | "folder" | "tags">>,
    ) => {
      if (!note?.id) return;
      pendingSave.current = { ...(pendingSave.current ?? {}), ...patch };
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(flushSave, 600);
    },
    [note?.id, flushSave],
  );

  const handleBodyChange = useCallback(
    (value?: string) => {
      const next = value ?? "";
      setBody(next);
      scheduleSave({ body: next });
    },
    [scheduleSave],
  );

  const completionData = useMemo(
    () => ({
      noteTitles: notes
        .filter((item) => !item.deleted)
        .map((item) => item.title || FLAVOUR.unnamedNote),
      tags: [
        ...new Set(notes.filter((item) => !item.deleted).flatMap((item) => item.tags)),
      ].sort(),
    }),
    [notes],
  );
  const completionRef = useRef(completionData);
  useEffect(() => {
    completionRef.current = completionData;
  }, [completionData]);
  const getCompletionData = useCallback(() => completionRef.current, []);

  const extensions = useMemo(
    () =>
      buildEditorExtensions({
        getCompletionData,
        onTogglePreview: () => setShowPreview((value) => !value),
        focusMode,
        typewriterMode,
      }),
    [getCompletionData, focusMode, typewriterMode],
  );

  const backlinks = useMemo(
    () => (note ? backlinksFor(note, notes) : []),
    [note, notes],
  );
  const words = useMemo(() => countWords(body), [body]);
  const minutes = readingMinutes(words);

  function insertAtCursor(text: string) {
    const editor = viewRef.current;
    if (!editor || showPreview) {
      const next = `${body}${text}`;
      setBody(next);
      scheduleSave({ body: next });
      return;
    }
    const { from, to } = editor.state.selection.main;
    editor.dispatch({
      changes: { from, to, insert: text },
      selection: EditorSelection.cursor(from + text.length),
    });
    editor.focus();
  }

  async function uploadImages(files: File[]) {
    if (!note || files.length === 0) return;
    setUploading(true);
    let snippet = "";
    for (const file of files) {
      try {
        const attachment = await api.uploadAttachment(note.id, file);
        setAttachments((current) => [...current, attachment]);
        const isImage = (attachment.contentType ?? "").startsWith("image/");
        snippet += isImage
          ? `\n![${attachment.filename}](${attachment.url})\n`
          : `\n[${attachment.filename}](${attachment.url})\n`;
      } catch {
        // Individual failures are surfaced by the status line.
      }
    }
    setUploading(false);
    if (snippet) insertAtCursor(snippet);
  }

  /** Pasting an image tucks it into the Haversack and inscribes it. */
  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length === 0) return;
    event.preventDefault();
    void uploadImages(files);
  }

  async function removeAttachment(id: string) {
    try {
      await api.deleteAttachment(id);
      setAttachments((current) => current.filter((item) => item.id !== id));
    } catch {
      // Nothing we can do locally; the item stays listed.
    }
  }

  /** Preview clicks either tick a checkbox or follow a wikilink. */
  function handlePreviewClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      event.preventDefault();
      const container = event.currentTarget;
      const boxes = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
      );
      const index = boxes.indexOf(target);
      if (index >= 0) {
        const next = toggleTaskAt(body, index);
        setBody(next);
        scheduleSave({ body: next });
      }
      return;
    }

    const anchor = target.closest("[data-wikilink]");
    if (!anchor) return;
    event.preventDefault();
    const link = anchor.getAttribute("data-wikilink") ?? "";
    const resolved = resolveWikiLink(link, notes);
    if (resolved) onSelectNote(resolved.id);
    else setMissingLink(link);
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
            <p className="text-lg font-semibold text-gold-300">
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

  /** The canvas menu reads the word and line under the cursor before it opens. */
  function openCanvasMenu(event: MouseEvent<HTMLElement>) {
    if (!note) return;
    const editor = viewRef.current;
    const entries: ContextMenuEntry[] = [];

    let taskLine = false;
    let wiki: string | null = null;
    let doubtful: WordSpan | null = null;
    let lineFrom = 0;

    if (editor && !showPreview) {
      const pos = editor.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos !== null) {
        const selection = editor.state.selection.main;
        const insideSelection =
          !selection.empty && pos >= selection.from && pos <= selection.to;
        if (!insideSelection) {
          editor.dispatch({ selection: EditorSelection.cursor(pos) });
        }
        const line = editor.state.doc.lineAt(pos);
        lineFrom = line.from;
        const offset = pos - line.from;
        wiki = wikilinkAt(line.text, offset);
        taskLine = TASK_LINE.test(line.text);
        const span = wordAt(line.text, offset);
        if (
          span &&
          !isProtectedSpan(protectedRanges(line.text), span.from, span.to) &&
          isMisspelled(span.text)
        ) {
          doubtful = span;
        }
      }
    }

    if (doubtful) {
      const word = doubtful;
      const anchor = lineFrom;
      entries.push({ heading: FLAVOUR.spellSuggest });
      const options = suggestionsFor(word.text);
      if (options.length === 0) {
        entries.push({ label: FLAVOUR.spellNone, disabled: true });
      } else {
        for (const option of options) {
          entries.push({
            label: option,
            icon: <SpellCheck size={15} />,
            onSelect: () => {
              if (!editor) return;
              const from = anchor + word.from;
              const to = anchor + word.to;
              editor.dispatch({
                changes: { from, to, insert: option },
                selection: EditorSelection.cursor(from + option.length),
              });
              editor.focus();
            },
          });
        }
      }
      entries.push({
        label: FLAVOUR.spellAdd,
        icon: <BookPlus size={15} />,
        onSelect: () => addToLexicon(word.text),
      });
      entries.push({ separator: true });
    }

    if (wiki) {
      const target = wiki;
      entries.push({
        label: FLAVOUR.wikilinkOpen,
        icon: <Link2 size={15} />,
        onSelect: () => {
          const resolved = resolveWikiLink(target, notes);
          if (resolved) onSelectNote(resolved.id);
          else setMissingLink(target);
        },
      });
    }

    if (taskLine) {
      entries.push({
        label: FLAVOUR.fmtToggleTask,
        icon: <ListChecks size={15} />,
        onSelect: () => {
          if (editor) formatTask(editor);
        },
      });
    }

    entries.push({
      label: showPreview ? FLAVOUR.previewHide : FLAVOUR.previewShow,
      icon: showPreview ? <EyeOff size={15} /> : <Eye size={15} />,
      onSelect: () => setShowPreview((value) => !value),
    });
    entries.push({
      label: FLAVOUR.insertDate,
      icon: <Calendar size={15} />,
      onSelect: () => insertAtCursor(formatStamp("date")),
    });
    entries.push({
      label: FLAVOUR.insertTime,
      icon: <Clock size={15} />,
      onSelect: () => insertAtCursor(formatStamp("time")),
    });
    entries.push({
      label: FLAVOUR.insertDateTime,
      icon: <CalendarClock size={15} />,
      onSelect: () => insertAtCursor(formatStamp("datetime")),
    });
    entries.push({ separator: true });

    if (note.deleted) {
      entries.push({
        label: FLAVOUR.undelete,
        icon: <Undo2 size={15} />,
        onSelect: () => void onUndelete(note.id),
      });
    } else {
      entries.push({
        label: FLAVOUR.deleteConfirm,
        icon: <Trash2 size={15} />,
        danger: true,
        onSelect: () => {
          if (
            window.confirm(
              `${FLAVOUR.deleteConfirm}\n\n${FLAVOUR.deleteConfirmBody}`,
            )
          ) {
            void onDelete(note.id);
          }
        },
      });
    }

    contextMenu.open(event, entries);
  }

  return (
    <section
      className={cx(
        "relative flex h-full min-w-0 flex-col",
        dragging && "ring-2 ring-inset ring-gold-400/50",
      )}
      onPaste={handlePaste}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void uploadImages(Array.from(event.dataTransfer.files));
      }}
      onContextMenu={openCanvasMenu}
    >
      <header
        className="flex items-center gap-1 px-3 py-2 sm:px-5"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={FLAVOUR.backToArchives}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-parchment-100 lg:hidden"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <span className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview((value) => !value)}
          aria-label={showPreview ? FLAVOUR.previewHide : FLAVOUR.previewShow}
          title={showPreview ? FLAVOUR.previewHide : FLAVOUR.previewShow}
          aria-pressed={showPreview}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-gold-300 sm:h-8 sm:w-8"
        >
          {showPreview ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
        <SyncDot status={syncStatus} onSync={onSync} />
        <Menu
          label="Page"
          trigger={<MoreHorizontal size={18} />}
          sheet
          panelClassName="sm:w-[min(20rem,calc(100vw-1.5rem))]"
        >
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
                  className="h-11 w-full rounded-lg border border-[var(--color-void-700)] bg-void-950/60 px-3 text-base text-parchment-100 outline-none focus:border-gold-500/50 sm:h-9 sm:text-sm"
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
                  className="h-11 w-full rounded-lg border border-[var(--color-void-700)] bg-void-950/60 px-3 text-base text-parchment-100 outline-none focus:border-gold-500/50 sm:h-9 sm:text-sm"
                />
              </div>

              {attachments.length > 0 ? (
                <>
                  <MenuLabel>Haversack</MenuLabel>
                  <ul className="animate-fade-in-up flex flex-wrap gap-1.5 px-2 pb-1">
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
                          className="grid h-6 w-6 place-items-center rounded text-parchment-500 hover:text-ember-400"
                        >
                          <Trash2 size={12} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="px-3 pb-2 pt-1 text-xs text-parchment-500">
                  {FLAVOUR.haversackPasteHint}
                </p>
              )}

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

      {missingLink ? (
        <div className="px-5 pb-1 sm:px-6">
          <StatusLine flavour={FLAVOUR.wikilinkMissing} />
        </div>
      ) : null}

      <div key={note.id} className="animate-page-in flex min-h-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[44rem] px-3 pt-3 sm:px-6 sm:pt-6">
          <textarea
            ref={titleRef}
            rows={1}
            aria-label="Note title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              scheduleSave({ title: event.target.value });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                viewRef.current?.focus();
              }
            }}
            placeholder={FLAVOUR.noteTitlePlaceholder}
            spellCheck={false}
            className="w-full resize-none overflow-hidden bg-transparent text-center text-2xl font-semibold leading-snug text-parchment-100 outline-none placeholder:font-normal placeholder:text-parchment-500/60 sm:text-3xl"
          />
        </div>

        <div className="mx-auto min-h-0 w-full max-w-[44rem] flex-1 px-2 sm:px-6">
          {showPreview ? (
            <div className="animate-fade-in-up h-full overflow-y-auto">
              <div className="py-4 sm:py-8">
                <div
                  className="prose-arcane"
                  onClick={handlePreviewClick}
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
            <CodeMirror
              value={body}
              onChange={handleBodyChange}
              onCreateEditor={(editor) => {
                viewRef.current = editor;
                setView(editor);
              }}
              extensions={extensions}
              theme="none"
              basicSetup={false}
              indentWithTab={false}
              height="100%"
              style={{ height: "100%" }}
            />
          )}
        </div>

        <div className="mx-auto w-full max-w-[44rem] shrink-0 px-3 sm:px-6">
          {showBacklinks && backlinks.length > 0 ? (
            <div className="animate-fade-in-up max-h-[30dvh] overflow-y-auto border-t border-[var(--color-void-700)] py-3">
              <p className="text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500">
                {FLAVOUR.linkedMentions}
              </p>
              <ul className="mt-2 space-y-0.5">
                {backlinks.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectNote(item.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-parchment-300 transition-colors hover:bg-white/[0.05] hover:text-parchment-100"
                    >
                      <Link2
                        size={13}
                        aria-hidden="true"
                        className="shrink-0 text-parchment-500"
                      />
                      <span className="truncate">
                        {item.title || FLAVOUR.unnamedNote}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            className="flex items-center justify-between gap-3 border-t border-[var(--color-void-700)] py-1.5 text-[0.6875rem] text-parchment-500"
            style={{ paddingBottom: "calc(0.375rem + var(--safe-bottom))" }}
          >
            <span aria-hidden="true">
              {words} {FLAVOUR.statWords} · {minutes} {FLAVOUR.statRead}
            </span>
            <span className="sr-only">
              {words} words, {minutes} minute read.
            </span>
            {backlinks.length > 0 ? (
              <button
                type="button"
                aria-expanded={showBacklinks}
                onClick={() => setShowBacklinks((value) => !value)}
                className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-white/[0.06] hover:text-gold-300"
              >
                {backlinks.length} {FLAVOUR.linkedMentionsShort}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <SelectionToolbar view={view} />
      <ContextMenu state={contextMenu.state} onClose={contextMenu.close} />
    </section>
  );
}

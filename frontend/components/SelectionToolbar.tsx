import { useEffect, useState, type ReactNode } from "react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  Quote,
  Strikethrough,
} from "lucide-react";
import type { EditorView } from "@codemirror/view";
import { FLAVOUR } from "../../shared/messages";
import {
  formatBold,
  formatHighlight,
  formatInlineCode,
  formatItalic,
  formatLink,
  formatQuote,
  formatStrike,
  formatTask,
  formatBulletList,
  setHeading,
} from "../lib/editor/format";

interface ToolbarAction {
  id: string;
  label: string;
  icon: ReactNode;
  run: (view: EditorView) => boolean;
}

const ACTIONS: ToolbarAction[] = [
  { id: "bold", label: FLAVOUR.fmtBold, icon: <Bold size={15} />, run: formatBold },
  {
    id: "italic",
    label: FLAVOUR.fmtItalic,
    icon: <Italic size={15} />,
    run: formatItalic,
  },
  {
    id: "strike",
    label: FLAVOUR.fmtStrike,
    icon: <Strikethrough size={15} />,
    run: formatStrike,
  },
  {
    id: "highlight",
    label: FLAVOUR.fmtHighlight,
    icon: <Highlighter size={15} />,
    run: formatHighlight,
  },
  {
    id: "code",
    label: FLAVOUR.fmtCode,
    icon: <Code size={15} />,
    run: formatInlineCode,
  },
  { id: "link", label: FLAVOUR.fmtLink, icon: <LinkIcon size={15} />, run: formatLink },
  {
    id: "h2",
    label: FLAVOUR.fmtHeading,
    icon: <Heading2 size={15} />,
    run: (view) => setHeading(view, 2),
  },
  {
    id: "h3",
    label: FLAVOUR.fmtSubheading,
    icon: <Heading3 size={15} />,
    run: (view) => setHeading(view, 3),
  },
  {
    id: "quote",
    label: FLAVOUR.fmtQuote,
    icon: <Quote size={15} />,
    run: formatQuote,
  },
  {
    id: "list",
    label: FLAVOUR.fmtList,
    icon: <List size={15} />,
    run: formatBulletList,
  },
  {
    id: "task",
    label: FLAVOUR.fmtTask,
    icon: <ListChecks size={15} />,
    run: formatTask,
  },
];

interface Position {
  x: number;
  y: number;
}

/** A floating bar over a live selection — Medium's reflexes, Obsidian's reach. */
export function SelectionToolbar({ view }: { view: EditorView | null }) {
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (!view) return;
    const dom = view.dom;

    // Read the selection from the editor state: CodeMirror draws selection
    // itself, so the native DOM selection is not a reliable source.
    const update = () => {
      const selection = view.state.selection.main;
      if (selection.empty || !view.hasFocus) {
        setPosition(null);
        return;
      }
      const start = view.coordsAtPos(selection.from);
      const end = view.coordsAtPos(selection.to);
      if (!start || !end) {
        setPosition(null);
        return;
      }
      setPosition({
        x: (start.left + end.right) / 2,
        y: Math.min(start.top, end.top),
      });
    };

    const hide = () => setPosition(null);

    dom.addEventListener("mouseup", update);
    dom.addEventListener("keyup", update);
    dom.addEventListener("focusout", hide);
    window.addEventListener("blur", hide);
    document.addEventListener("selectionchange", update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      dom.removeEventListener("mouseup", update);
      dom.removeEventListener("keyup", update);
      dom.removeEventListener("focusout", hide);
      window.removeEventListener("blur", hide);
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [view]);

  if (!view || !position) return null;

  const clampX = Math.min(Math.max(position.x, 148), window.innerWidth - 148);
  const showBelow = position.y < 64;

  return (
    <div
      role="toolbar"
      aria-label={FLAVOUR.formatToolbar}
      onMouseDown={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        left: clampX,
        top: showBelow ? position.y + 24 : position.y,
      }}
      className={
        "animate-pop-in fixed z-[65] flex items-center gap-0.5 rounded-[var(--radius-control)] border border-[var(--color-void-700)] bg-void-800/95 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm " +
        (showBelow
          ? "-translate-x-1/2"
          : "-translate-x-1/2 -translate-y-[calc(100%+10px)]")
      }
    >
      {ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          title={action.label}
          aria-label={action.label}
          onClick={() => {
            action.run(view);
            setPosition(null);
          }}
          className="grid h-8 w-8 place-items-center rounded-md text-parchment-500 transition-colors hover:bg-white/[0.08] hover:text-gold-300"
        >
          <span aria-hidden="true">{action.icon}</span>
        </button>
      ))}
    </div>
  );
}

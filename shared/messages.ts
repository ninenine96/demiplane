/**
 * Demiplane lexicon.
 *
 * Every user-facing string lives here so the voice stays consistent. See the
 * Flavour Charter in AGENTS.md: every moment carries the flavour, but clarity
 * always outranks it when something is risky or broken.
 *
 * When a string is surfaced to a screen reader, pair it with a `plain` status
 * so the meaning is unambiguous. `plain` lines deliberately read like normal
 * status text.
 */
export const FLAVOUR = {
  // --- Empty states -------------------------------------------------------
  emptyNotes: "This demiplane is empty.",
  emptyFolder: "Nothing inscribed here yet.",
  emptySearch: "The archives hold nothing by that name.",
  emptyTrash: "The Void is empty. For now.",

  // --- Authoring ----------------------------------------------------------
  newNote: "Inscribe a new page.",
  noteTitlePlaceholder: "Name this page...",
  editorPlaceholder: "Speak your mind onto the page...",
  previewShow: "Reveal the page",
  previewHide: "Veil the page",
  backToArchives: "Back to the archives",
  deleteConfirm: "Banish this page?",
  deleteConfirmBody:
    "It will be sent to the Void, where it can be recovered for a while. No page is truly gone until the Void is cleared.",
  deleteDone: "Sent to the Void.",
  undelete: "Recover from the Void.",
  undeleted: "Pulled back from the Void.",
  savePending:
    "Inscribed. Will reach the demiplane when the portal opens.",
  saveSynced: "Committed to the demiplane.",

  // --- Editor / formatting ------------------------------------------------
  formatToolbar: "Format the selection",
  fmtBold: "Bind in bold",
  fmtItalic: "Slant the text",
  fmtStrike: "Strike the text through",
  fmtHighlight: "Mark the text",
  fmtCode: "Inscribe as code",
  fmtLink: "Forge a link",
  fmtHeading: "Raise to a heading",
  fmtSubheading: "Lower to a subheading",
  fmtQuote: "Set as a quotation",
  fmtList: "Set as a list",
  fmtTask: "Set as a task",
  fmtToggleTask: "Flip the task's mark",
  fmtTitle: "Inscribe a title",
  fmtNumbered: "Set as a tally",
  fmtCodeBlock: "Open a code block",
  fmtImage: "Tuck in an image",
  fmtWikilink: "Summon a page by name",
  fmtCallout: "Open a callout",
  fmtTable: "Raise a table",
  fmtDivider: "Draw a divider",
  insertDate: "Inscribe today's date",
  insertTime: "Inscribe the current hour",
  insertDateTime: "Inscribe the date and the hour",
  taskOpen: "Task open",
  taskDone: "Task complete",

  // --- Wikilinks / backlinks ---------------------------------------------
  linkedMentions: "Linked mentions",
  linkedMentionsShort: "linked",
  wikilinkMissing:
    "No page bears that name yet. Inscribe it, and the link will hold.",

  // --- Stats --------------------------------------------------------------
  statWords: "runes",
  statRead: "min read",

  // --- Command palette ----------------------------------------------------
  paletteTitle: "Speak a working",
  palettePlaceholder: "Speak a working...",
  paletteWorkings: "Workings",
  palettePage: "The page",
  palettePages: "Pages",
  paletteEmpty: "No working answers to that name.",

  // --- Focus / typewriter -------------------------------------------------
  focusMode: "Focus the page",
  typewriterMode: "Centre the quill",

  // --- Archive ------------------------------------------------------------
  archiveToggle: "Summon or fold the archive",

  // --- Enlarge / Reduce presets ------------------------------------------
  scaleReduce: "Reduce",
  scaleDefault: "True sight",
  scaleEnlarge: "Enlarge",

  // --- Sync / connection --------------------------------------------------
  syncInProgress: "Opening a portal...",
  syncDone: "The demiplane is in accord.",
  syncFailed: "The portal flickered — retrying.",
  syncNow: "Open a portal",
  offline:
    "You've stepped outside the ley lines. Changes are safe here until the portal returns.",
  online: "The ley lines hum again. The portal is open.",
  conflict:
    "Two timelines converged — both versions preserved.",
  conflictNoteSuffix: "conflict",

  // --- Auth ---------------------------------------------------------------
  codeSent: "A sending stone is on its way — it bears a sigil.",
  codeSentPlain: "If that address is the keeper of this demiplane, a login code has been sent.",
  codePrompt: "Enter the sigil inscribed on the sending stone.",
  resendCode: "Request another stone",
  codeInvalid: "That sigil is not recognised. Read the stone again.",
  codeLocked: "Too many wrong sigils. Request a fresh sending stone.",
  loginConfirmed: "The portal recognises you.",
  loginPrompt: "Speak the keeper's email to unseal the portal.",
  loginButton: "Send a sending stone",
  confirmLogin: "Unseal the portal",
  rememberLocation: "Remember this location for a fortnight.",
  rememberLocationHint:
    "Leave it unchecked to let the portal forget you when this window closes.",
  logout: "You slip back through the portal.",
  unauthorized: "The portal does not recognise you.",
  sessionExpired: "The portal has forgotten you. Ask for a new sending stone.",
  invalidSendingStone: "That sending stone has crumbled to dust. Request another.",
  authRateLimited: "The stones need a moment to cool. Try again shortly.",

  // --- Search -------------------------------------------------------------
  searchPlaceholder: "Scry the archives...",
  searchClear: "Clear the scrying pool",

  // --- Enlarge / Reduce ---------------------------------------------------
  enlarge: "Enlarge / Reduce",
  enlargeUp: "Enlarge the archive",
  enlargeDown: "Reduce the archive",
  trueSight: "Return to true sight",

  // --- Keys ---------------------------------------------------------------
  shortcutsTitle: "Grimoire of keys",
  shortcutsHint: "Every working of this demiplane, inscribed for the swift.",

  // --- Attachments / backup ----------------------------------------------
  attachmentUpload: "Tucking it into the Haversack...",
  attachmentDone: "Safely in the Haversack.",
  attachmentFailed: "The Haversack resisted. Try again.",
  haversackPasteHint:
    "Paste an image into the page and it is tucked into the Haversack.",
  export: "Copy your grimoire.",
  exporting: "Copying your grimoire...",
  exportDone: "Your grimoire is copied. Keep it somewhere safe.",
  import: "Restore from a fallen timeline.",
  importConfirm:
    "Restoring will merge another grimoire into this demiplane. Existing pages with the same name are kept as conflicts.",
  importDone: "The fallen timeline has been folded in.",

  // --- Errors / status ----------------------------------------------------
  notFound: "This page has drifted into the Astral Plane.",
  errorGeneric: "A wild surge in the weave. Nothing was lost — try again.",
  loadError: "The scrying pool is clouded. Try again.",
  saving: "Inscribing...",
  loading: "Consulting the archives...",
  unnamedNote: "An untitled page",
  emptyTags: "No sigils yet.",
  folderNew: "New satchel",
  folderRename: "Rename satchel",
  tagNew: "Inscribe a sigil",
} as const;

/**
 * Plain status lines for `aria-live` regions. Screen readers get the meaning,
 * not just the joke.
 */
export const PLAIN = {
  idle: "Ready.",
  loadingNotes: "Loading notes.",
  loadingNote: "Loading note.",
  saving: "Saving.",
  saved: "Saved locally.",
  syncing: "Syncing.",
  synced: "Synced.",
  offline: "Offline. Changes are stored on this device.",
  syncError: "Sync failed. Will retry.",
  authError: "Sign-in failed.",
  attachmentUploading: "Uploading attachment.",
  attachmentUploaded: "Attachment uploaded.",
  attachmentError: "Attachment upload failed.",
  error: "Something went wrong.",
} as const;

export type FlavourKey = keyof typeof FLAVOUR;
export type PlainKey = keyof typeof PLAIN;

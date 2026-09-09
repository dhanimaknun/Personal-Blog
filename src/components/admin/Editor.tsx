"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Columns2,
  PenLine,
  Eye,
  History,
  Undo2,
  Redo2,
  Sparkles,
  MoreHorizontal,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  Image as ImageIcon,
  Heading2,
  List,
  Link2,
  Code2,
} from "lucide-react";
import type { Post } from "@prisma/client";
import { api } from "@/lib/client";
import { autoExcerpt, countWords, readingTime, slugify } from "@/lib/text";
import { relativeTime } from "@/lib/dates";
import { Markdown } from "@/components/Markdown";

type Snapshot = { title: string; content: string; excerpt: string; tags: string };
type ViewMode = "split" | "write" | "preview";

const AUTOSAVE_MS = 5000;

function toTags(input: string) {
  return input
    .split(",")
    .map((t) => t.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);
}

export function Editor({ initial }: { initial: Post }) {
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [content, setContent] = useState(initial.content);
  const [status, setStatus] = useState(initial.status);

  const [savedAt, setSavedAt] = useState<Date>(initial.updatedAt);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [view, setView] = useState<ViewMode>("split");
  const [busy, setBusy] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // dirty tracking
  const lastSaved = useRef<Snapshot>({
    title: initial.title,
    content: initial.content,
    excerpt: initial.excerpt,
    tags: initial.tags.join(", "),
  });
  const current: Snapshot = { title, content, excerpt, tags };
  const dirty = useMemo(
    () => JSON.stringify(current) !== JSON.stringify(lastSaved.current),
    [title, content, excerpt, tags],
  );

  // undo / redo
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const historyTimer = useRef<ReturnType<typeof setTimeout>>();

  const pushHistory = useCallback((snap: Snapshot) => {
    clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => {
      const top = past.current[past.current.length - 1];
      if (!top || JSON.stringify(top) !== JSON.stringify(snap)) {
        past.current.push(snap);
        if (past.current.length > 100) past.current.shift();
        future.current = [];
        rerender();
      }
    }, 600);
  }, []);

  function apply(snap: Snapshot) {
    setTitle(snap.title);
    setContent(snap.content);
    setExcerpt(snap.excerpt);
    setTags(snap.tags);
  }

  function undo() {
    if (!past.current.length) return;
    const prev = past.current.pop()!;
    future.current.push(current);
    apply(prev);
    rerender();
  }
  function redo() {
    if (!future.current.length) return;
    const next = future.current.pop()!;
    past.current.push(current);
    apply(next);
    rerender();
  }

  // counters
  const words = useMemo(() => countWords(content), [content]);
  const chars = content.length;
  const mins = useMemo(() => readingTime(content), [content]);

  // ---- saving ----
  const save = useCallback(
    async (opts: { autosave: boolean } = { autosave: true }) => {
      setSaveState("saving");
      try {
        const updated = await api<Post>(`/api/posts/${initial.id}`, {
          method: "PUT",
          json: {
            title,
            slug,
            excerpt,
            content,
            tags: toTags(tags),
            autosave: opts.autosave,
          },
        });
        lastSaved.current = { title, content, excerpt, tags };
        setSlug(updated.slug);
        setSavedAt(new Date(updated.updatedAt));
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
        router.refresh();
      } catch (err) {
        setSaveState("error");
        console.error(err);
      }
    },
    [initial.id, title, slug, excerpt, content, tags, router],
  );

  // debounced autosave
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!dirty) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save({ autosave: true }), AUTOSAVE_MS);
    return () => clearTimeout(autosaveTimer.current);
  }, [dirty, save]);

  // save on unmount / tab hide if dirty
  useEffect(() => {
    function flush() {
      if (JSON.stringify({ title, content, excerpt, tags }) !== JSON.stringify(lastSaved.current)) {
        navigator.sendBeacon?.(
          `/api/posts/${initial.id}`,
          new Blob([JSON.stringify({ title, slug, excerpt, content, tags: toTags(tags), autosave: true })], {
            type: "application/json",
          }),
        );
      }
    }
    window.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [initial.id, title, slug, excerpt, content, tags]);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save({ autosave: false });
      }
      const editing = ["TEXTAREA", "INPUT"].includes((e.target as HTMLElement)?.tagName);
      if (meta && e.key.toLowerCase() === "z" && !editing) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (meta && e.target === contentRef.current) {
        const k = e.key.toLowerCase();
        if (k === "b") { e.preventDefault(); format("bold"); }
        else if (k === "i") { e.preventDefault(); format("italic"); }
        else if (k === "u") { e.preventDefault(); format("underline"); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  // field change helpers that also feed the undo history
  function onField<T extends keyof Snapshot>(key: T, value: string) {
    const setters: Record<keyof Snapshot, (v: string) => void> = {
      title: setTitle,
      content: setContent,
      excerpt: setExcerpt,
      tags: setTags,
    };
    setters[key](value);
    pushHistory({ ...current, [key]: value });
    if (key === "title" && status === "DRAFT" && slug === slugify(lastSaved.current.title)) {
      setSlug(slugify(value));
    }
  }

  // ---- markdown formatting toolbar ----
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function replaceRange(from: number, to: number, text: string, selStart: number, selEnd: number) {
    const next = content.slice(0, from) + text + content.slice(to);
    onField("content", next);
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  function surround(before: string, after = before) {
    const el = contentRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = content.slice(s, e);
    // toggle off if already wrapped
    if (
      content.slice(s - before.length, s) === before &&
      content.slice(e, e + after.length) === after
    ) {
      replaceRange(s - before.length, e + after.length, sel, s - before.length, e - before.length);
      return;
    }
    replaceRange(s, e, before + sel + after, s + before.length, e + before.length);
  }

  function prefixLines(prefix: string) {
    const el = contentRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const start = content.lastIndexOf("\n", s - 1) + 1;
    const block = content.slice(start, e);
    const lines = block.split("\n");
    const allPrefixed = lines.every((l) => l.startsWith(prefix));
    const updated = lines
      .map((l) => (allPrefixed ? l.slice(prefix.length) : prefix + l))
      .join("\n");
    replaceRange(start, e, updated, start, start + updated.length);
  }

  function insertAtCursor(text: string) {
    const el = contentRef.current;
    const s = el?.selectionStart ?? content.length;
    replaceRange(s, s, text, s + text.length, s + text.length);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      const alt = file.name.replace(/\.[^.]+$/, "") || "image";
      insertAtCursor(`\n\n![${alt}](${data.url})\n\n`);
    } catch (err) {
      const url = window.prompt(
        `${(err as Error).message}\n\nPaste an image URL to insert instead:`,
      );
      if (url) insertAtCursor(`\n\n![image](${url.trim()})\n\n`);
    } finally {
      setUploading(false);
    }
  }

  function format(kind: string) {
    switch (kind) {
      case "bold": return surround("**");
      case "italic": return surround("_");
      case "underline": return surround("++");
      case "strike": return surround("~~");
      case "code": return surround("`");
      case "quote": return prefixLines("> ");
      case "h2": return prefixLines("## ");
      case "list": return prefixLines("- ");
      case "link": {
        const el = contentRef.current;
        if (!el) return;
        const sel = content.slice(el.selectionStart, el.selectionEnd) || "text";
        return replaceRange(
          el.selectionStart,
          el.selectionEnd,
          `[${sel}](url)`,
          el.selectionStart + sel.length + 3,
          el.selectionStart + sel.length + 6,
        );
      }
      case "image": return fileInputRef.current?.click();
    }
  }

  async function runAction(action: "publish" | "unpublish" | "duplicate" | "trash") {
    setMenuOpen(false);
    setBusy(action);
    try {
      if (dirty) await save({ autosave: false });
      if (action === "trash") {
        await api(`/api/posts/${initial.id}`, { method: "DELETE" });
        router.push("/admin/posts");
        return;
      }
      if (action === "duplicate") {
        const copy = await api<Post>(`/api/posts/${initial.id}/duplicate`, { method: "POST" });
        router.push(`/admin/posts/${copy.id}`);
        return;
      }
      const updated = await api<Post>(`/api/posts/${initial.id}/${action}`, { method: "POST" });
      setStatus(updated.status);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const statusLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? "Save failed"
        : dirty
          ? "Unsaved changes"
          : `Saved ${relativeTime(savedAt)}`;

  return (
    <div className="flex min-h-screen flex-col">
      {/* top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-divider bg-canvas/90 px-5 py-2.5 backdrop-blur">
        <Link href="/admin/posts" className="rounded-md p-1.5 text-secondary hover:bg-divider/60 hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex items-center gap-1.5 text-[12.5px] text-secondary">
          {saveState === "saving" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saveState === "saved" ? (
            <Check className="h-3.5 w-3.5 text-accent" />
          ) : null}
          <span className={saveState === "error" ? "text-[#c8102e]" : ""}>{statusLabel}</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 hidden text-[12px] tabular-nums text-secondary sm:inline">
            {words.toLocaleString()} words · {mins} min
          </span>

          <button
            onClick={undo}
            disabled={!past.current.length}
            className="rounded-md p-1.5 text-secondary hover:bg-divider/60 hover:text-ink disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={!future.current.length}
            className="rounded-md p-1.5 text-secondary hover:bg-divider/60 hover:text-ink disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>

          <div className="mx-1 h-4 w-px bg-divider" />

          <ViewToggle view={view} setView={setView} />

          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`rounded-md p-1.5 hover:bg-divider/60 hover:text-ink ${
              showHistory ? "text-accent" : "text-secondary"
            }`}
            title="Version history"
          >
            <History className="h-4 w-4" />
          </button>

          <div className="mx-1 h-4 w-px bg-divider" />

          <button
            onClick={() => runAction(status === "PUBLISHED" ? "unpublish" : "publish")}
            disabled={busy !== null}
            className="rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy === "publish" || busy === "unpublish" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : status === "PUBLISHED" ? (
              "Unpublish"
            ) : (
              "Publish"
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-md p-1.5 text-secondary hover:bg-divider/60 hover:text-ink"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-lg border border-divider bg-white py-1">
                <button onClick={() => save({ autosave: false })} className="menu-item">
                  Save now
                </button>
                <Link
                  href={`/admin/preview/${initial.id}`}
                  target="_blank"
                  className="menu-item block"
                  onClick={() => setMenuOpen(false)}
                >
                  Open preview
                </Link>
                <button onClick={() => runAction("duplicate")} className="menu-item">
                  Duplicate
                </button>
                <button
                  onClick={() => runAction("trash")}
                  className="menu-item text-[#c8102e]"
                >
                  Move to trash
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* editor + preview */}
        <div className="flex min-w-0 flex-1">
          {(view === "split" || view === "write") && (
            <div className={`min-w-0 ${view === "split" ? "w-1/2 border-r border-divider" : "mx-auto w-full max-w-[760px]"}`}>
              <div className="px-8 py-10">
                <input
                  value={title}
                  onChange={(e) => onField("title", e.target.value)}
                  placeholder="Title"
                  className="w-full bg-transparent font-display text-[34px] font-semibold leading-tight tracking-tight text-ink placeholder:text-divider focus:outline-none"
                />

                <div className="mt-4 flex items-center gap-2 text-[13px] text-secondary">
                  <span className="text-divider">/</span>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="slug"
                    className="min-w-0 flex-1 bg-transparent text-secondary focus:text-ink focus:outline-none"
                  />
                </div>

                <input
                  value={tags}
                  onChange={(e) => onField("tags", e.target.value)}
                  placeholder="Tags, comma separated"
                  className="mt-3 w-full bg-transparent text-[13px] text-secondary placeholder:text-divider focus:text-ink focus:outline-none"
                />

                <div className="mt-3 flex items-start gap-2">
                  <textarea
                    value={excerpt}
                    onChange={(e) => onField("excerpt", e.target.value)}
                    placeholder="Excerpt (auto-generated if left blank)"
                    rows={2}
                    className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-secondary placeholder:text-divider focus:text-ink focus:outline-none"
                  />
                  <button
                    onClick={() => onField("excerpt", autoExcerpt(content))}
                    title="Generate excerpt"
                    className="mt-0.5 shrink-0 rounded-md p-1 text-secondary hover:bg-divider/60 hover:text-accent"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-6 border-t border-divider" />

                <FormatBar onFormat={format} uploading={uploading} />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(f);
                    e.target.value = "";
                  }}
                />

                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => onField("content", e.target.value)}
                  onPaste={(e) => {
                    const item = Array.from(e.clipboardData.items).find((i) =>
                      i.type.startsWith("image/"),
                    );
                    const file = item?.getAsFile();
                    if (file) {
                      e.preventDefault();
                      uploadFile(file);
                    }
                  }}
                  onDrop={(e) => {
                    const file = Array.from(e.dataTransfer.files).find((f) =>
                      f.type.startsWith("image/"),
                    );
                    if (file) {
                      e.preventDefault();
                      uploadFile(file);
                    }
                  }}
                  placeholder="Write in Markdown…"
                  spellCheck
                  className="thin-scroll mt-4 min-h-[60vh] w-full resize-none bg-transparent font-mono text-[14px] leading-[1.75] text-ink placeholder:text-divider focus:outline-none"
                />

                <p className="mt-4 text-[12px] tabular-nums text-secondary">
                  {words.toLocaleString()} words · {chars.toLocaleString()} characters · {mins} min read
                </p>
              </div>
            </div>
          )}

          {(view === "split" || view === "preview") && (
            <div className={`min-w-0 overflow-y-auto ${view === "split" ? "w-1/2" : "mx-auto w-full max-w-[820px]"}`}>
              <div className="px-8 py-10">
                <p className="text-[13px] text-secondary">{new Date(savedAt).toDateString()}</p>
                <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-tight text-ink">
                  {title || "Untitled"}
                </h1>
                <div className="mt-8">
                  <Markdown>{content || "_Nothing to preview yet._"}</Markdown>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* history drawer */}
        {showHistory ? (
          <HistoryPanel postId={initial.id} onClose={() => setShowHistory(false)} onRestored={() => router.refresh()} />
        ) : null}
      </div>
    </div>
  );
}

function FormatBar({
  onFormat,
  uploading,
}: {
  onFormat: (kind: string) => void;
  uploading: boolean;
}) {
  const groups: { kind: string; icon: typeof Bold; label: string }[][] = [
    [
      { kind: "bold", icon: Bold, label: "Bold  ⌘B" },
      { kind: "italic", icon: Italic, label: "Italic  ⌘I" },
      { kind: "underline", icon: Underline, label: "Underline  ⌘U" },
      { kind: "strike", icon: Strikethrough, label: "Strikethrough" },
    ],
    [
      { kind: "h2", icon: Heading2, label: "Heading" },
      { kind: "quote", icon: Quote, label: "Quote" },
      { kind: "list", icon: List, label: "List" },
      { kind: "code", icon: Code2, label: "Code" },
      { kind: "link", icon: Link2, label: "Link" },
    ],
    [{ kind: "image", icon: ImageIcon, label: "Insert image" }],
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-1">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <span className="mx-1.5 h-4 w-px bg-divider" />}
          {group.map(({ kind, icon: Icon, label }) => (
            <button
              key={kind}
              type="button"
              title={label}
              onClick={() => onFormat(kind)}
              disabled={kind === "image" && uploading}
              className="rounded-md p-1.5 text-secondary transition-colors hover:bg-divider/50 hover:text-ink disabled:opacity-40"
            >
              {kind === "image" && uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function ViewToggle({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  const items: { key: ViewMode; icon: typeof Eye; label: string }[] = [
    { key: "write", icon: PenLine, label: "Write" },
    { key: "split", icon: Columns2, label: "Split" },
    { key: "preview", icon: Eye, label: "Preview" },
  ];
  return (
    <div className="flex items-center rounded-lg bg-divider/50 p-0.5">
      {items.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setView(key)}
          title={label}
          className={`rounded-md p-1.5 transition-colors ${
            view === key ? "bg-white text-ink" : "text-secondary hover:text-ink"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

type Version = {
  id: string;
  title: string;
  excerpt: string;
  label: string;
  createdAt: string;
};

function HistoryPanel({
  postId,
  onClose,
  onRestored,
}: {
  postId: string;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    api<Version[]>(`/api/posts/${postId}/versions`).then(setVersions).catch(() => setVersions([]));
  }, [postId]);

  async function restore(id: string) {
    setRestoring(id);
    try {
      await api(`/api/posts/${postId}/versions/${id}/restore`, { method: "POST" });
      onRestored();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRestoring(null);
    }
  }

  return (
    <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-divider bg-[#faf9f6] px-4 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">
          Version history
        </h2>
        <button onClick={onClose} className="text-[13px] text-secondary hover:text-ink">
          Close
        </button>
      </div>

      {versions === null ? (
        <p className="mt-6 text-[13px] text-secondary">Loading…</p>
      ) : versions.length === 0 ? (
        <p className="mt-6 text-[13px] text-secondary">
          No history yet. Snapshots are saved when you publish or press Save.
        </p>
      ) : (
        <ul className="mt-4 space-y-1">
          {versions.map((v) => (
            <li key={v.id} className="rounded-lg border border-divider bg-white p-3">
              <p className="text-[13px] font-medium text-ink">{v.title || "Untitled"}</p>
              <p className="mt-0.5 text-[11.5px] uppercase tracking-wide text-secondary">
                {v.label} · {relativeTime(v.createdAt)}
              </p>
              <button
                onClick={() => restore(v.id)}
                disabled={restoring === v.id}
                className="mt-2 text-[12px] text-accent hover:opacity-70 disabled:opacity-50"
              >
                {restoring === v.id ? "Restoring…" : "Restore this version"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

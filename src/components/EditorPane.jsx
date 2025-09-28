// src/components/EditorPane.jsx
import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export default function EditorPane({ docJSON, onDocChange, onSelectionChange, decorations }) {
  const editor = useEditor({
    extensions: [StarterKit, ParagraphWithStableId, ExternalDecorations],
    content: docJSON,
    onUpdate: ({ editor }) => onDocChange(editor.getJSON()),
    editorProps: { attributes: { class: "tiptap" } },
  });

  // --- selection reporter -> block-relative offsets
  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      if (!editor || editor.isDestroyed) return;
      const { from, to } = editor.state.selection;
      if (from === to) {
        onSelectionChange(null);
        return;
      }

      const $pos = editor.state.selection.$head;
      let blockNode = null;
      for (let d = $pos.depth; d >= 0; d--) {
        const n = $pos.node(d);
        if (n.type.name === "paragraph") { blockNode = n; break; }
      }
      const blockId = blockNode?.attrs?.id || "p_?";
      const text = editor.state.doc.textBetween(from, to, " ");

      const blk = findBlockPos(editor.state.doc, blockId);
      if (!blk) { onSelectionChange(null); return; }
      onSelectionChange({ blockId, from: from - blk.start, to: to - blk.start, text });
    };

    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);

    return () => {
      if (!editor || editor.isDestroyed) return;
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor, onSelectionChange]);

  // --- push new decoration ranges into extension storage
  useEffect(() => {
    if (!editor) return;
    const ext = editor.extensionManager.extensions.find(e => e.name === "externalDecorations");
    if (ext) {
      ext.storage.ranges = decorations || [];
      editor.view.dispatch(editor.state.tr); // repaint
    }
  }, [editor, decorations]);

  return <EditorContent editor={editor} />;
}

/* ---------- Extensions ---------- */

// Assign ids to paragraphs once (no reconfigure)
const ParagraphWithStableId = Extension.create({
  name: "paragraphStableId",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_trs, _old, state) => {
          let tr = state.tr;
          let changed = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === "paragraph" && !node.attrs.id) {
              tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: genId() });
              changed = true;
            }
          });
          return changed ? tr : null;
        },
      }),
    ];
  },
});

// One decorations plugin; reads ranges from extension storage
const ExternalDecorations = Extension.create({
  name: "externalDecorations",
  addStorage() { return { ranges: [] }; }, // [{blockId, from, to, className}]
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => decorationSetFromRanges(state.doc, this.storage.ranges),
        },
      }),
    ];
  },
});

/* ---------- Helpers ---------- */
function genId() { return "p_" + Math.random().toString(36).slice(2, 8); }

function findBlockPos(doc, blockId) {
  let found = null;
  doc.descendants((node, pos) => {
    if (node.type.name === "paragraph" && node.attrs?.id === blockId) {
      found = { start: pos + 1, end: pos + node.nodeSize - 1 }; // inside para
      return false;
    }
    return true;
  });
  return found;
}

function decorationSetFromRanges(doc, ranges) {
  const decos = [];
  for (const r of ranges || []) {
    const blk = findBlockPos(doc, r.blockId);
    if (!blk) continue;
    const from = blk.start + r.from;
    const to = blk.start + r.to;
    if (to > from) decos.push(Decoration.inline(from, to, { class: r.className || "comment-highlight" }));
  }
  return DecorationSet.create(doc, decos);
}

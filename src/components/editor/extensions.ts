import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Extension } from "@tiptap/core";

/** Font size lives on the textStyle mark, next to color and font family. */
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.fontSize || null,
            renderHTML: (a: { fontSize?: string | null }) => (a.fontSize ? { style: `font-size:${a.fontSize}` } : {}),
          },
        },
      },
    ];
  },
});

/** Images keep a media id (the file stays in private storage) and an optional width. */
const MediaImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-media-id"),
        renderHTML: (a: { mediaId?: string | null }) => (a.mediaId ? { "data-media-id": a.mediaId } : {}),
      },
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-width"),
        renderHTML: (a: { width?: string | null }) => (a.width ? { "data-width": a.width, style: `width:${a.width}` } : {}),
      },
    };
  },
});

export function buildExtensions(variant: "full" | "compact", placeholder: string) {
  const base = [
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder }),
  ];
  return variant === "full"
    ? [...base, MediaImage.configure({ inline: false }), Table.configure({ resizable: true }), TableRow, TableHeader, TableCell]
    : base;
}

import JSZip from "jszip";
import { decodeXmlEntities } from "./xml";

export class UnsupportedDocxFormatError extends Error {}

/**
 * A .docx is a zip of XML, same family as .pptx (see pptx.ts). The document
 * body lives at word/document.xml; each <w:p> is a paragraph, and joining
 * its <w:t> runs (in order) reconstructs the paragraph's text.
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file("word/document.xml");
  if (!file) throw new UnsupportedDocxFormatError("Not a valid .docx file");
  const xml = await file.async("text");

  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  return paragraphs
    .map((p) => [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => decodeXmlEntities(m[1])).join(""))
    .filter(Boolean)
    .join("\n");
}

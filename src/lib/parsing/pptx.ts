import JSZip from "jszip";
import { decodeXmlEntities } from "./xml";

interface RawParsedSlide {
  title: string;
  body: string;
  notes: string;
}

function textRuns(xml: string): string[] {
  return [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]));
}

function maxFontSize(block: string): number {
  const sizes = [...block.matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1]));
  return sizes.length ? Math.max(...sizes) : 0;
}

function extractSlideText(xml: string): { title: string; body: string } {
  const shapeBlocks = xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) ?? [];
  if (shapeBlocks.length === 0) {
    const texts = textRuns(xml);
    return { title: texts[0] ?? "", body: texts.slice(1).join("\n") };
  }

  const shapes = shapeBlocks
    .map((block) => ({ block, text: textRuns(block).join(" ").trim() }))
    .filter((s) => s.text);
  if (shapes.length === 0) return { title: "", body: "" };

  let titleShape = shapes.find((s) => /<p:ph[^>]*type="(title|ctrTitle)"/.test(s.block));
  if (!titleShape) {
    // Decks built from freeform text boxes (e.g. Canva/Figma exports) carry
    // no PowerPoint title placeholder at all, so every shape would otherwise
    // fall into an undifferentiated body. The largest font on the slide is
    // reliably the title in that layout style, so use it as a fallback.
    titleShape = shapes.reduce((a, b) => (maxFontSize(b.block) > maxFontSize(a.block) ? b : a));
  }

  const bodyParts = shapes.filter((s) => s !== titleShape).map((s) => s.text);
  return { title: titleShape.text, body: bodyParts.join("\n") };
}

function extractNotesText(xml: string): string {
  // The notes slide XML also embeds a placeholder for the slide thumbnail
  // (type="sldImg"), which carries no <a:t> text, so a flat text-run join
  // naturally picks up only the actual speaker notes.
  return textRuns(xml).join(" ").trim();
}

/**
 * Resolves true presentation order (not filename order — PowerPoint does
 * not renumber slideN.xml files when slides are reordered or deleted) via
 * presentation.xml's <p:sldIdLst> and the presentation.xml.rels mapping.
 */
async function resolveSlideOrder(zip: JSZip): Promise<string[]> {
  const presentationXml = await zip.file("ppt/presentation.xml")?.async("text");
  const relsXml = await zip.file("ppt/_rels/presentation.xml.rels")?.async("text");
  if (!presentationXml || !relsXml) return [];

  const relIdToTarget = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)) {
    relIdToTarget.set(m[1], m[2]);
  }
  // Some producers order the attributes the other way around.
  for (const m of relsXml.matchAll(/<Relationship[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"[^>]*\/>/g)) {
    if (!relIdToTarget.has(m[2])) relIdToTarget.set(m[2], m[1]);
  }

  const orderedPaths: string[] = [];
  for (const m of presentationXml.matchAll(/<p:sldId[^>]*r:id="([^"]+)"/g)) {
    const target = relIdToTarget.get(m[1]);
    if (target) orderedPaths.push(`ppt/${target.replace(/^\.?\//, "")}`);
  }
  return orderedPaths;
}

/**
 * Flattens a parsed deck into a single text blob (slide title/body/notes,
 * in presentation order) for callers that just want document text, e.g.
 * the idea-canvas autofill flow — same shape as extractDocxText/extractPdfText.
 */
export async function extractPptxText(buffer: Buffer): Promise<string> {
  const slides = await parsePptx(buffer);
  return slides
    .map((s, i) => {
      const parts = [`Slide ${i + 1}: ${s.title}`.trim(), s.body, s.notes ? `Notes: ${s.notes}` : ""].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");
}

export async function parsePptx(buffer: Buffer): Promise<RawParsedSlide[]> {
  const zip = await JSZip.loadAsync(buffer);

  let slidePaths = await resolveSlideOrder(zip);
  if (slidePaths.length === 0) {
    // Fallback: filename order, if presentation.xml couldn't be resolved.
    slidePaths = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/slide(\d+)\.xml/)![1]) - Number(b.match(/slide(\d+)\.xml/)![1]));
  }

  const slides: RawParsedSlide[] = [];
  for (const path of slidePaths) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async("text");
    const { title, body } = extractSlideText(xml);

    const num = path.match(/slide(\d+)\.xml/)?.[1];
    let notes = "";
    const notesFile = num ? zip.file(`ppt/notesSlides/notesSlide${num}.xml`) : null;
    if (notesFile) {
      notes = extractNotesText(await notesFile.async("text"));
    }

    slides.push({ title, body, notes });
  }
  return slides;
}

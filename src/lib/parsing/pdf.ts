import { PDFParse } from "pdf-parse";
import { getPath as getPdfWorkerPath } from "pdf-parse/worker";

interface RawParsedSlide {
  title: string;
  body: string;
  notes: string;
}

// pdfjs-dist (which pdf-parse wraps) loads its parser worker via a dynamic
// import that Next's bundler (both webpack and Turbopack) resolves
// incorrectly in a server context, throwing "Setting up fake worker
// failed". Pointing it at the real on-disk file sidesteps the bundler
// entirely — this is pdf-parse's own documented fix for Next.js/serverless.
let workerConfigured = false;
function ensurePdfWorkerConfigured() {
  if (workerConfigured) return;
  PDFParse.setWorker(getPdfWorkerPath());
  workerConfigured = true;
}

/**
 * A PDF export of a pitch deck is one page per slide with no separate
 * speaker-notes stream, so each page becomes one slide with notes left
 * empty. Title is heuristically the first non-empty line on the page.
 */
export async function parsePdfDeck(buffer: Buffer): Promise<RawParsedSlide[]> {
  ensurePdfWorkerConfigured();
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => {
      const lines = page.text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const [title, ...rest] = lines;
      return { title: title ?? "", body: rest.join("\n"), notes: "" };
    });
  } finally {
    await parser.destroy();
  }
}

/** Full document text, no per-page/slide segmentation — used by the idea-canvas autofill flow. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  ensurePdfWorkerConfigured();
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => page.text).join("\n\n");
  } finally {
    await parser.destroy();
  }
}

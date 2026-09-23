import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getServerLocale } from "@/lib/i18n/locale.server";
import { extractDocxText } from "@/lib/parsing/docx";
import { extractPdfText } from "@/lib/parsing/pdf";
import { autofillIdeaCanvas } from "@/lib/agents/idea-validation/autofill";

const IMAGE_EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const locale = await getServerLocale();
  const formData = await request.formData();
  const file = formData.get("document");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A document file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const lower = file.name.toLowerCase();
  const imageExt = Object.keys(IMAGE_EXTENSIONS).find((ext) => lower.endsWith(ext));

  try {
    let result;
    if (lower.endsWith(".pdf")) {
      result = await autofillIdeaCanvas({ text: await extractPdfText(buffer), locale });
    } else if (lower.endsWith(".docx")) {
      result = await autofillIdeaCanvas({ text: await extractDocxText(buffer), locale });
    } else if (imageExt) {
      const mime = IMAGE_EXTENSIONS[imageExt];
      result = await autofillIdeaCanvas({ imageDataUrl: `data:${mime};base64,${buffer.toString("base64")}`, locale });
    } else {
      return NextResponse.json({ error: "Unsupported file type — upload a .docx, .pdf, or image (.png/.jpg/.webp)." }, { status: 400 });
    }
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not read that file" },
      { status: 400 }
    );
  }
}

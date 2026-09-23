import { NextResponse } from "next/server";
import { getPitchById, saveUploadedDeck, setPitchStage } from "@/lib/db/queries/pitches";
import { parseDeck, UnsupportedDeckFormatError } from "@/lib/parsing/deckParser";

interface Params {
  params: Promise<{ pitchId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { pitchId } = await params;
  const pitch = await getPitchById(pitchId);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("deck");
  const script = formData.get("script");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A deck file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let slides;
  try {
    slides = await parseDeck(file.name, buffer);
  } catch (err) {
    if (err instanceof UnsupportedDeckFormatError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  await saveUploadedDeck(pitchId, file.name, slides, typeof script === "string" && script.trim() ? script.trim() : null);
  await setPitchStage(pitchId, "parse_check");

  return NextResponse.json({ pitch: await getPitchById(pitchId) });
}

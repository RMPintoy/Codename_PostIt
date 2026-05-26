import { head } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing file URL." }, { status: 400 });
  }

  try {
    const blob = await head(url);
    return NextResponse.redirect(blob.downloadUrl, { status: 307 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not open the file.",
      },
      { status: 500 },
    );
  }
}

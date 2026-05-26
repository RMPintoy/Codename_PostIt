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
    const response = await fetch(blob.downloadUrl, { cache: "no-store" });

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: "Could not stream the file." },
        { status: 500 },
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      response.headers.get("content-type") || "application/octet-stream",
    );
    headers.set(
      "Cache-Control",
      response.headers.get("cache-control") || "private, no-store",
    );

    return new Response(response.body, {
      status: 200,
      headers,
    });
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

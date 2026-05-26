import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing file URL." }, { status: 400 });
  }

  try {
    const blobUrl = new URL(url);

    if (!blobUrl.hostname.endsWith(".blob.vercel-storage.com")) {
      return NextResponse.json({ error: "Invalid blob URL." }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Blob token is not configured." },
        { status: 500 },
      );
    }

    const response = await fetch(blobUrl.toString(), {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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
      "Content-Disposition",
      response.headers.get("content-disposition") || "inline",
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

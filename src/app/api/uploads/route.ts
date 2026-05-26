import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { MessageAttachment } from "@/lib/messages";
import {
  assertStorageReady,
  getUploadsDirectory,
  usingLocalFileStorage,
} from "@/lib/storage";

const maxUploadSize = 4 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  try {
    assertStorageReady();

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json(
        { error: "You can upload up to five files at once." },
        { status: 400 },
      );
    }

    const attachments: MessageAttachment[] = [];
    const uploadsDirectory = getUploadsDirectory();

    if (usingLocalFileStorage()) {
      await mkdir(uploadsDirectory, { recursive: true });
    }

    for (const file of files) {
      if (file.size > maxUploadSize) {
        return NextResponse.json(
          { error: `${file.name} is larger than 4 MB.` },
          { status: 400 },
        );
      }

      const extension = path.extname(file.name);
      const basename = path.basename(file.name, extension);
      const storedName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(
        basename,
      )}${sanitizeFileName(extension)}`;

      let url: string;

      if (usingLocalFileStorage()) {
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(uploadsDirectory, storedName), buffer);
        url = `/uploads/${storedName}`;
      } else {
        const blob = await put(`uploads/${storedName}`, file, {
          access: "public",
          addRandomSuffix: false,
          contentType: file.type || "application/octet-stream",
        });
        url = blob.url;
      }

      attachments.push({
        id: randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        url,
      });
    }

    return NextResponse.json(attachments);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not upload the files.",
      },
      { status: 500 },
    );
  }
}

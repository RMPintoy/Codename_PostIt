import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { MessageAttachment } from "@/lib/messages";
import { getUploadsDirectory } from "@/lib/messages";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
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

  const uploadsDirectory = getUploadsDirectory();
  await mkdir(uploadsDirectory, { recursive: true });

  const attachments: MessageAttachment[] = [];

  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: `${file.name} is larger than 10 MB.` },
        { status: 400 },
      );
    }

    const extension = path.extname(file.name);
    const basename = path.basename(file.name, extension);
    const storedName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(
      basename,
    )}${sanitizeFileName(extension)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDirectory, storedName), buffer);

    attachments.push({
      id: randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      url: `/uploads/${storedName}`,
    });
  }

  return NextResponse.json(attachments);
}

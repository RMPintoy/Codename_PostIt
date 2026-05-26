import { randomUUID } from "node:crypto";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MessageAttachment, MessageRecord } from "@/lib/messages";

const dataDirectory = path.join(process.cwd(), "data");
const messagesFile = path.join(dataDirectory, "messages.json");
const uploadsDirectory = path.join(process.cwd(), "public", "uploads");
const messagesBlobPath = "app-state/messages.json";

function canUseBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

export function isBlobStorageConfigured() {
  return canUseBlobStorage();
}

export function usingLocalFileStorage() {
  return !canUseBlobStorage() && !isVercelRuntime();
}

export function assertStorageReady() {
  if (!usingLocalFileStorage() && !canUseBlobStorage()) {
    throw new Error(
      "Vercel Blob is not configured. Create a Blob store and add BLOB_READ_WRITE_TOKEN before deploying.",
    );
  }
}

export function getUploadsDirectory() {
  return uploadsDirectory;
}

export async function ensureLocalStorage() {
  await mkdir(dataDirectory, { recursive: true });
  await mkdir(uploadsDirectory, { recursive: true });
}

function normalizeMessages(
  parsed: Array<MessageRecord & { author?: string; senderId?: string; codename?: string }>,
) {
  return parsed
    .map((message) => ({
      id: message.id,
      senderId: message.senderId || `legacy-${message.id}`,
      codename: message.codename || message.author || "Archive Otter",
      body: message.body,
      attachments: message.attachments || [],
      createdAt: message.createdAt,
    }))
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
}

async function streamToString(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    output += decoder.decode(value, { stream: true });
  }

  output += decoder.decode();
  return output;
}

export async function readMessages() {
  assertStorageReady();

  if (usingLocalFileStorage()) {
    await ensureLocalStorage();

    try {
      const file = await readFile(messagesFile, "utf8");
      const parsed = JSON.parse(file) as Array<
        MessageRecord & { author?: string; senderId?: string; codename?: string }
      >;

      return normalizeMessages(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [] as MessageRecord[];
      }

      throw error;
    }
  }

  const result = await get(messagesBlobPath, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return [] as MessageRecord[];
  }

  const file = await streamToString(result.stream);
  const parsed = JSON.parse(file) as Array<
    MessageRecord & { author?: string; senderId?: string; codename?: string }
  >;

  return normalizeMessages(parsed);
}

export async function appendMessage(input: {
  senderId: string;
  codename: string;
  body: string;
  attachments: MessageAttachment[];
}) {
  const message: MessageRecord = {
    id: randomUUID(),
    senderId: input.senderId,
    codename: input.codename,
    body: input.body,
    attachments: input.attachments,
    createdAt: new Date().toISOString(),
  };

  assertStorageReady();

  if (usingLocalFileStorage()) {
    const messages = await readMessages();
    messages.push(message);
    await writeFile(messagesFile, JSON.stringify(messages, null, 2), "utf8");
    return message;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await get(messagesBlobPath, { access: "private" });
    const currentMessages =
      current?.statusCode === 200 && current.stream
        ? normalizeMessages(
            JSON.parse(await streamToString(current.stream)) as Array<
              MessageRecord & {
                author?: string;
                senderId?: string;
                codename?: string;
              }
            >,
          )
        : [];

    currentMessages.push(message);

    try {
      await put(
        messagesBlobPath,
        Buffer.from(JSON.stringify(currentMessages, null, 2), "utf8"),
        {
        access: "private",
        allowOverwrite: true,
        contentType: "application/json",
        ifMatch: current?.blob.etag,
        },
      );

      return message;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError && attempt < 3) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not save the message after retrying.");
}

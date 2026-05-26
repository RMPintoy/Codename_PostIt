import { randomUUID } from "node:crypto";
import { get, list, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MessageAttachment, MessageRecord } from "@/lib/messages";

const dataDirectory = path.join(process.cwd(), "data");
const messagesFile = path.join(dataDirectory, "messages.json");
const uploadsDirectory = path.join(process.cwd(), "public", "uploads");
const messagesBlobPrefix = "messages/";
const legacyMessagesBlobPath = "app-state/messages.json";

function canUseBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime() {
  return process.env.VERCEL === "1";
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

type StoredMessage = MessageRecord & {
  author?: string;
  senderId?: string;
  senderDeviceId?: string;
  codename?: string;
};

function normalizeMessages(parsed: StoredMessage[]) {
  return parsed
    .map((message) => ({
      id: message.id,
      senderId: message.senderId || `legacy-${message.id}`,
      senderDeviceId:
        message.senderDeviceId || message.senderId || `legacy-${message.id}`,
      codename: message.codename || message.author || "Archive Otter",
      body: message.body,
      attachments: message.attachments || [],
      createdAt: message.createdAt,
    }))
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
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

async function readLegacyBlobMessages() {
  const result = await get(legacyMessagesBlobPath, { access: "private" });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return [] as MessageRecord[];
  }

  const file = await streamToString(result.stream);
  const parsed = JSON.parse(file) as StoredMessage[];
  return normalizeMessages(parsed);
}

async function readBlobMessages() {
  const { blobs } = await list({
    limit: 1000,
    mode: "expanded",
    prefix: messagesBlobPrefix,
  });

  const messageBlobs = blobs.filter((blob) => blob.pathname.endsWith(".json"));

  if (messageBlobs.length === 0) {
    return readLegacyBlobMessages();
  }

  const results = await Promise.all(
    messageBlobs.map(async (blob) => {
      const response = await get(blob.pathname, { access: "private" });

      if (!response || response.statusCode !== 200 || !response.stream) {
        return null;
      }

      const file = await streamToString(response.stream);
      return JSON.parse(file) as StoredMessage;
    }),
  );

  return normalizeMessages(results.filter((message): message is StoredMessage => Boolean(message)));
}

export async function readMessages() {
  assertStorageReady();

  if (usingLocalFileStorage()) {
    await ensureLocalStorage();

    try {
      const file = await readFile(messagesFile, "utf8");
      const parsed = JSON.parse(file) as StoredMessage[];
      return normalizeMessages(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [] as MessageRecord[];
      }

      throw error;
    }
  }

  return readBlobMessages();
}

export async function appendMessage(input: {
  senderId: string;
  senderDeviceId: string;
  codename: string;
  body: string;
  attachments: MessageAttachment[];
}) {
  const message: MessageRecord = {
    id: randomUUID(),
    senderId: input.senderId,
    senderDeviceId: input.senderDeviceId,
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

  const blobPath = `${messagesBlobPrefix}${message.createdAt}-${message.id}.json`;

  await put(blobPath, Buffer.from(JSON.stringify(message, null, 2), "utf8"), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "application/json; charset=utf-8",
  });

  return message;
}

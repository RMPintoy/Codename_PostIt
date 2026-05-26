import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type MessageAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

export type MessageRecord = {
  id: string;
  senderId: string;
  codename: string;
  body: string;
  attachments: MessageAttachment[];
  createdAt: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const messagesFile = path.join(dataDirectory, "messages.json");
const uploadsDirectory = path.join(process.cwd(), "public", "uploads");

async function ensureStorage() {
  await mkdir(dataDirectory, { recursive: true });
  await mkdir(uploadsDirectory, { recursive: true });
}

export async function listMessages() {
  await ensureStorage();

  try {
    const file = await readFile(messagesFile, "utf8");
    const parsed = JSON.parse(file) as Array<
      MessageRecord & { author?: string; senderId?: string; codename?: string }
    >;

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
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [] as MessageRecord[];
    }

    throw error;
  }
}

export async function createMessage(input: {
  senderId: string;
  codename: string;
  body: string;
  attachments: MessageAttachment[];
}) {
  const messages = await listMessages();

  const message: MessageRecord = {
    id: randomUUID(),
    senderId: input.senderId,
    codename: input.codename,
    body: input.body,
    attachments: input.attachments,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  await writeFile(messagesFile, JSON.stringify(messages, null, 2), "utf8");

  return message;
}

export function getUploadsDirectory() {
  return uploadsDirectory;
}

import { appendMessage, getUploadsDirectory, readMessages } from "@/lib/storage";

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

export async function listMessages() {
  return readMessages();
}

export async function createMessage(input: {
  senderId: string;
  codename: string;
  body: string;
  attachments: MessageAttachment[];
}) {
  return appendMessage(input);
}

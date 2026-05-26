import { NextResponse } from "next/server";
import { getClientIp, getSenderIdentity } from "@/lib/identity";
import { createMessage, listMessages } from "@/lib/messages";

export async function GET() {
  try {
    const messages = await listMessages();
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load messages.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      body?: string;
      attachments?: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
        url: string;
      }>;
    };

    const body = payload.body?.trim() || "";
    const attachments = Array.isArray(payload.attachments)
      ? payload.attachments
      : [];
    const { senderId, codename } = getSenderIdentity(getClientIp(request.headers));

    if (body.length === 0 && attachments.length === 0) {
      return NextResponse.json(
        { error: "Write something or attach a file before posting." },
        { status: 400 },
      );
    }

    if (body.length > 3000) {
      return NextResponse.json(
        { error: "Message is too long." },
        { status: 400 },
      );
    }

    await createMessage({
      senderId,
      codename,
      body,
      attachments: attachments.slice(0, 5),
    });

    const messages = await listMessages();
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save the message.",
      },
      { status: 500 },
    );
  }
}

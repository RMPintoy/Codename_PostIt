import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateViewerId,
  getSenderIdentity,
  viewerCookieName,
} from "@/lib/identity";
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

export async function POST(request: NextRequest) {
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
    const viewerId = getOrCreateViewerId(
      request.cookies.get(viewerCookieName)?.value,
    );
    const { senderId, codename } = getSenderIdentity(viewerId);

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
      senderDeviceId: viewerId,
      codename,
      body,
      attachments: attachments.slice(0, 5),
    });

    const messages = await listMessages();
    const response = NextResponse.json(messages);
    response.cookies.set(viewerCookieName, viewerId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
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

import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateViewerId,
  getSenderIdentity,
  viewerCookieName,
} from "@/lib/identity";

export async function GET(request: NextRequest) {
  try {
    const viewerId = getOrCreateViewerId(
      request.cookies.get(viewerCookieName)?.value,
    );
    const viewer = getSenderIdentity(viewerId);
    const response = NextResponse.json({
      viewerId,
      senderId: viewer.senderId,
      codename: viewer.codename,
    });

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
          error instanceof Error ? error.message : "Could not load viewer.",
      },
      { status: 500 },
    );
  }
}

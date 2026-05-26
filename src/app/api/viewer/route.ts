import { NextResponse } from "next/server";
import { getClientIp, getSenderIdentity } from "@/lib/identity";

export async function GET(request: Request) {
  try {
    const viewer = getSenderIdentity(getClientIp(request.headers));
    return NextResponse.json(viewer);
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

import { headers } from "next/headers";
import { MessageBoard } from "@/components/message-board";
import { getClientIp, getSenderIdentity } from "@/lib/identity";
import { listMessages } from "@/lib/messages";

export default async function Home() {
  const requestHeaders = await headers();
  const initialMessages = await listMessages();
  const viewer = getSenderIdentity(getClientIp(requestHeaders));

  return (
    <main>
      <MessageBoard initialMessages={initialMessages} viewerId={viewer.senderId} />
    </main>
  );
}

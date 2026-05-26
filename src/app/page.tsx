import { MessageBoard } from "@/components/message-board";
import { listMessages } from "@/lib/messages";

export default async function Home() {
  const initialMessages = await listMessages();

  return (
    <main>
      <MessageBoard initialMessages={initialMessages} />
    </main>
  );
}

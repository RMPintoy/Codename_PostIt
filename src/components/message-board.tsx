"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import styles from "./message-board.module.css";
import { formatMessageToHtml } from "@/lib/rich-text";
import type { MessageAttachment, MessageRecord } from "@/lib/messages";

const emojiChoices = [
  "\u{1F600}",
  "\u{1F602}",
  "\u{1F60D}",
  "\u{1F525}",
  "\u{1F389}",
  "\u{1F44D}",
  "\u{1F64F}",
  "\u{1F4AC}",
];

const formatterButtons = [
  { label: "Bold", left: "**", right: "**", placeholder: "bold text" },
  { label: "Italic", left: "_", right: "_", placeholder: "italic text" },
  { label: "Underline", left: "++", right: "++", placeholder: "underlined text" },
];

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateStamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function MessageBoard({
  initialMessages,
  viewerId,
}: {
  initialMessages: MessageRecord[];
  viewerId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const refreshMessages = async () => {
      try {
        const response = await fetch("/api/messages", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const nextMessages = (await response.json()) as MessageRecord[];
        setMessages(nextMessages);
      } catch {
        // Keep the current list if the refresh fails.
      }
    };

    const timer = window.setInterval(refreshMessages, 4000);

    return () => window.clearInterval(timer);
  }, []);

  const previewHtml = useMemo(() => formatMessageToHtml(body), [body]);

  const focusComposer = () => {
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const insertMarkup = (left: string, right: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);
    const replacement = `${left}${selected || placeholder}${right}`;
    const nextBody = `${body.slice(0, start)}${replacement}${body.slice(end)}`;

    setBody(nextBody);
    focusComposer();

    window.requestAnimationFrame(() => {
      const cursor = selected ? start + replacement.length : start + left.length;
      textarea.setSelectionRange(
        cursor,
        cursor + (selected ? 0 : placeholder.length),
      );
    });
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((current) => `${current}${emoji}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextBody = `${body.slice(0, start)}${emoji}${body.slice(end)}`;

    setBody(nextBody);
    focusComposer();

    window.requestAnimationFrame(() => {
      const cursor = start + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPendingFiles(Array.from(event.target.files ?? []));
  };

  const uploadAttachments = async () => {
    if (pendingFiles.length === 0) {
      return [] as MessageAttachment[];
    }

    const formData = new FormData();
    pendingFiles.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed.");
    }

    return (await response.json()) as MessageAttachment[];
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    if (body.trim().length === 0 && pendingFiles.length === 0) {
      setStatus("Write something or attach a file before posting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const attachments = await uploadAttachments();
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body,
          attachments,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Could not send the message.");
      }

      const nextMessages = (await response.json()) as MessageRecord[];
      setMessages(nextMessages);
      setBody("");
      setPendingFiles([]);
      setStatus("Message posted.");

      const fileInput = document.getElementById("attachments") as
        | HTMLInputElement
        | null;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not send the message.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.appShell}>
        <section className={styles.chatCard}>
          <header className={styles.topbar}>
            <div>
              <span className={styles.eyebrow}>Animal codename chat</span>
              <h1 className={styles.title}>A cleaner shared message space.</h1>
            </div>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Messages</span>
                <strong>{messages.length}</strong>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Identity</span>
                <strong>You on the right</strong>
              </div>
            </div>
          </header>

          <div className={styles.subhead}>
            Everyone gets a stable animal codename based on IP. Your own posts
            stay on the right, everyone else stays on the left.
          </div>

          <div className={styles.messages}>
            {messages.length === 0 ? (
              <div className={styles.empty}>
                No messages yet. Start the conversation.
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.senderId === viewerId;

                return (
                  <article
                    className={
                      isOwnMessage
                        ? `${styles.messageRow} ${styles.messageRowOwn}`
                        : `${styles.messageRow} ${styles.messageRowOther}`
                    }
                    key={message.id}
                  >
                    <div
                      className={
                        isOwnMessage
                          ? `${styles.message} ${styles.messageOwn}`
                          : `${styles.message} ${styles.messageOther}`
                      }
                    >
                      <div className={styles.messageHeader}>
                        <strong className={styles.author}>{message.codename}</strong>
                        <span className={styles.timestamp}>
                          {formatTimestamp(message.createdAt)}
                        </span>
                      </div>

                      <div className={styles.messageMeta}>
                        {isOwnMessage ? "You" : "Guest"} -{" "}
                        {formatDateStamp(message.createdAt)}
                      </div>

                      <div
                        className={styles.messageBody}
                        dangerouslySetInnerHTML={{
                          __html: formatMessageToHtml(message.body),
                        }}
                      />

                      {message.attachments.length > 0 ? (
                        <div className={styles.attachments}>
                          {message.attachments.map((attachment) =>
                            attachment.type.startsWith("image/") ? (
                              <a
                                className={styles.imageFrame}
                                href={attachment.url}
                                key={attachment.id}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img src={attachment.url} alt={attachment.name} />
                              </a>
                            ) : (
                              <a
                                className={styles.attachmentLink}
                                href={attachment.url}
                                key={attachment.id}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <span>{attachment.name}</span>
                                <span>{formatFileSize(attachment.size)}</span>
                              </a>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelEyebrow}>Composer</span>
            <h2 className={styles.panelTitle}>Send a polished message</h2>
            <p className={styles.panelCopy}>
              Your codename is assigned automatically from your IP. Just write,
              format, and attach files up to 4 MB each.
            </p>
          </div>

          <form className={styles.stack} onSubmit={handleSubmit}>
            <div>
              <label className={styles.fieldLabel} htmlFor="body">
                Message
              </label>
              <div className={styles.toolbar}>
                {formatterButtons.map((button) => (
                  <button
                    className={styles.toolbarButton}
                    key={button.label}
                    onClick={() =>
                      insertMarkup(
                        button.left,
                        button.right,
                        button.placeholder,
                      )
                    }
                    type="button"
                  >
                    {button.label}
                  </button>
                ))}
              </div>

              <div className={styles.emojiRow}>
                {emojiChoices.map((emoji) => (
                  <button
                    className={styles.emojiButton}
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <textarea
                className={styles.textarea}
                id="body"
                maxLength={3000}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Share the update, plan, joke, or idea."
                ref={textareaRef}
                value={body}
              />

              <p className={styles.subtle}>
                Bold uses `**text**`, italic uses `_text_`, and underline uses
                `++text++`.
              </p>
            </div>

            <div>
              <label className={styles.fieldLabel} htmlFor="attachments">
                Attach images or files
              </label>
              <input
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv,.ppt,.pptx,.mp4,.mp3"
                className={styles.fileInput}
                id="attachments"
                multiple
                onChange={handleFilesChange}
                type="file"
              />

              {pendingFiles.length > 0 ? (
                <div className={styles.fileList}>
                  {pendingFiles.map((file) => (
                    <div className={styles.fileTag} key={`${file.name}-${file.size}`}>
                      {file.name} - {formatFileSize(file.size)}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={styles.preview}>
              <span className={styles.fieldLabel}>Preview</span>
              <div
                className={styles.previewBody}
                dangerouslySetInnerHTML={{
                  __html: previewHtml || "Your formatted preview shows up here.",
                }}
              />
            </div>

            <button
              className={styles.submitButton}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Posting..." : "Post message"}
            </button>

            <p className={styles.feedback}>{status}</p>
          </form>
        </aside>
      </div>
    </div>
  );
}

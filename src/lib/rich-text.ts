function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function applyDelimitedFormat(
  input: string,
  delimiter: string,
  openTag: string,
  closeTag: string,
) {
  const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `${escapedDelimiter}([^\\n]+?)${escapedDelimiter}`,
    "g",
  );

  return input.replace(pattern, `${openTag}$1${closeTag}`);
}

export function formatMessageToHtml(value: string) {
  let output = escapeHtml(value.trim());

  output = applyDelimitedFormat(output, "**", "<strong>", "</strong>");
  output = applyDelimitedFormat(output, "_", "<em>", "</em>");
  output = applyDelimitedFormat(output, "++", "<u>", "</u>");

  return output.replace(/\r?\n/g, "<br />");
}

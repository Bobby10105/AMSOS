import type { Attachment } from '@prisma/client';

/** Map attachment nomenclature (e.g. "1.1.a.1") to its API URL. */
export function buildAttachmentLinkMap(
  procedureNomenclature: string,
  attachments: Attachment[],
): Record<string, string> {
  const links: Record<string, string> = {};
  attachments.forEach((att, index) => {
    const ref = `${procedureNomenclature}.${index + 1}`;
    links[ref] = `/api/attachments/${att.id}`;
  });
  return links;
}

const ATTACHMENT_URL_PATTERN = /\/api\/attachments\/([0-9a-f-]{36})/i;

/** Extract attachment id from a pasted URL or path. */
export function extractAttachmentId(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(ATTACHMENT_URL_PATTERN);
  return match?.[1] ?? null;
}

/** Find nomenclature ref for an attachment API URL. */
export function findRefForAttachmentUrl(
  url: string,
  linkMap: Record<string, string>,
): string | null {
  const id = extractAttachmentId(url);
  if (!id) return null;

  const entry = Object.entries(linkMap).find(([, href]) => href.includes(id));
  return entry?.[0] ?? null;
}

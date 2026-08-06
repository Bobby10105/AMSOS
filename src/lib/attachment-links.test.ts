import { describe, it, expect } from 'vitest';
import {
  buildAttachmentLinkMap,
  extractAttachmentId,
  findRefForAttachmentUrl,
} from './attachment-links';

describe('attachment-links', () => {
  const attachments = [
    { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', displayOrder: 1 },
    { id: 'ffffffff-1111-2222-3333-444444444444', displayOrder: 2 },
  ] as Parameters<typeof buildAttachmentLinkMap>[1];

  it('builds nomenclature to URL map', () => {
    const map = buildAttachmentLinkMap('1.1.a', attachments);
    expect(map).toEqual({
      '1.1.a.1': '/api/attachments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      '1.1.a.2': '/api/attachments/ffffffff-1111-2222-3333-444444444444',
    });
  });

  it('extracts attachment id from API paths', () => {
    expect(extractAttachmentId('/api/attachments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(extractAttachmentId('https://app.example.com/api/attachments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('finds nomenclature ref from attachment URL', () => {
    const map = buildAttachmentLinkMap('1.1.a', attachments);
    expect(findRefForAttachmentUrl('/api/attachments/ffffffff-1111-2222-3333-444444444444', map)).toBe('1.1.a.2');
  });
});

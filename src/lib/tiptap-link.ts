import { Mark, mergeAttributes } from '@tiptap/core';

export const AttachmentLink = Mark.create({
  name: 'link',
  priority: 1000,
  keepOnSplit: false,
  inclusive: false,
  addAttributes() {
    return {
      href: { default: null },
      target: { default: '_blank' },
      rel: { default: 'noopener noreferrer nofollow' },
    };
  },
  parseHTML() {
    return [{ tag: 'a[href]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes), 0];
  },
});

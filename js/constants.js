/* ==========================================================
   Fixed lists and lookups used across the app
   ========================================================== */

/* Greyed-out hint shown inside an empty block, per block type. */
const PLACEHOLDERS = {
  p: "Type '/' for headings, bullets, tables…",
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  bullet: 'List item',
  num: 'List item',
  todo: 'To-do',
  toggle: 'Toggle title',
  quote: 'Quote',
  callout: 'Callout',
  code: 'Code'
};

/* Entries of the "/" menu: [type id, title, short description]. */
const BLOCK_TYPES = [
  ['p', 'Text', 'Plain paragraph'],
  ['h1', 'Heading 1', 'Large title'],
  ['h2', 'Heading 2', 'Medium heading'],
  ['h3', 'Heading 3', 'Small heading'],
  ['bullet', 'Bullet list', 'Simple list'],
  ['num', 'Numbered list', 'Ordered list'],
  ['todo', 'Checklist', 'Tick-able items'],
  ['toggle', 'Toggle', 'Hide / reveal text'],
  ['quote', 'Quote', 'Highlighted quote'],
  ['callout', 'Callout', 'Note in a box'],
  ['code', 'Code', 'Monospace block'],
  ['divider', 'Divider', 'Horizontal line'],
  ['cols', 'Two columns', 'Side by side text'],
  ['table', 'Table', 'Rows and columns']
];

/* Markdown-style shortcuts. Typing "# " at the start of an empty text block
   turns it into a Heading 1, "- " into a bullet, and so on. */
const SHORTCUT_PATTERN = /^(#{1,3}|[-*]|1\.|\[\]|>)[\s ]$/;
const SHORTCUT_TO_TYPE = {
  '#': 'h1',
  '##': 'h2',
  '###': 'h3',
  '-': 'bullet',
  '*': 'bullet',
  '1.': 'num',
  '[]': 'todo',
  '>': 'quote'
};

/* The three colour looks (see css/styles.css). */
const LOOKS = ['charcoal', 'ember', 'cream'];

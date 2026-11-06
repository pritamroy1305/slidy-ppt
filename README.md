# Slidey

Slides written like Notion. No sign up. Press Share and anyone with the link can view the slides.

## What is in this folder

```
index.html          the page (markup only)
css/styles.css      all the original styles, same rules, just readable
css/share.css       styles for the new Share button, dialog and link viewer
js/                 the app, split into small files (they load in the order listed in index.html)
  config.js         the two settings you may change (API_BASE, DIRECT)
  constants.js      block types, placeholders, markdown shortcuts
  utils.js          small helpers
  sanitize.js       safety checks for slides that arrive from a link
  state.js          saved data, saving, undo and redo
  richtext.js       bold / italic / highlight and the floating toolbar
  blocks.js         builds each block (text, lists, table, columns...)
  menus.js          the "/" menu and the small option menus
  editor.js         slide list, editor screen, toolbar buttons
  present.js        present mode, laser, fading pen, swipe and keys
  share.js          Share button and dialog
  viewer.js         opens a share link
  main.js           start-up
worker/             the tiny sharing backend (Cloudflare Worker)
```

Nothing was changed in how the app looks or saves. Slides already stored in people's
browsers keep working because the saved data has the same shape as before. The only visible
addition is the **Share** button in the header.

## How sharing works

1. Press **Share**. The slides are sent to the backend, which saves a clean copy and answers with a short id.
2. The dialog shows a link like `https://your-site/?p=x7Kq2mPa`.
3. Anyone who opens that link goes straight into present mode. No editor, no sign up.
4. Opening a link never touches the visitor's own saved slides.

A link is a snapshot of the slides at the moment you pressed Share. If you edit and want
the changes online, press Share again to get a new link.

## Set up the backend (about 10 minutes, free plan is enough)

You need a free Cloudflare account and Node.js on your computer.

```bash
cd worker
npx wrangler login
npx wrangler kv namespace create DECKS
```

The last command prints an `id`. Paste it into `worker/wrangler.toml` where it says
`PASTE_YOUR_KV_NAMESPACE_ID_HERE`. Then:

```bash
npx wrangler deploy
```

Wrangler prints the address of your Worker, something like
`https://slidey-api.yourname.workers.dev`. Check it by opening
`https://slidey-api.yourname.workers.dev/api/health` in a browser. It should show `{"ok":true}`.

Now tell the website where the backend is. In `js/config.js` set:

```js
const API_BASE = 'https://slidey-api.yourname.workers.dev';
```

Deploy the website again the way you do today. The site itself stays plain static files,
so it can stay on whatever host you use now.

### Lock it to your site (recommended)

In `worker/wrangler.toml` change `ALLOWED_ORIGIN = "*"` to your site's address, for example
`"https://slidey.example.com"`, and run `npx wrangler deploy` again. This stops other
websites from using your backend from a browser.

### Optional settings

- `DECK_TTL_DAYS` in `wrangler.toml`: delete shared decks after that many days. Without it they are kept.

## Safety built in

- Shared text can only contain bold, italic, highlight and line breaks. Anything else becomes plain text, both when saving (Worker) and when opening a link (website). This stops someone from sharing a deck that runs code in other people's browsers.
- Requests over 256 KB are refused. Limits also apply to slides (200), blocks per slide (300), table size and text length.
- Ids are random (8 characters), so links cannot be guessed one after another.

## Things to know

- **Abuse protection:** anyone who knows the Worker address can create decks. The size limits help, but for real traffic add a rate limit in the Cloudflare dashboard (Security, WAF, Rate limiting rules) for `POST /api/decks`.
- **Free plan limits:** Workers KV has a daily cap on writes on the free plan, and every Share is one write. Check Cloudflare's current limits if you expect many shares.
- **Slides are not private:** anyone with a link can see that deck, and the ids are not secret passwords. Do not share confidential slides.
- **`DIRECT`** in `js/config.js` works as before: `true` skips the home page.

## Backend reference

| Request | What it does |
| --- | --- |
| `POST /api/decks` with `{ "look": "charcoal", "slides": [...] }` | Saves the deck, answers `201 { "id": "..." }` |
| `GET /api/decks/:id` | Returns the saved deck, or `404` |
| `GET /api/health` | `{ "ok": true }` |

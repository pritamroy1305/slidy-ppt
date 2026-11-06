/* ==========================================================
   Slidey sharing backend (a tiny Cloudflare Worker)

   POST /api/decks        save a deck, answers { "id": "x7Kq2mPa" }
   GET  /api/decks/:id    returns the saved deck as JSON
   GET  /api/health       answers { "ok": true }

   Decks live in a Workers KV namespace bound as DECKS.
   Settings (see wrangler.toml):
     ALLOWED_ORIGIN  which website may call this API ("*" = any, or
                     one or more addresses separated by commas)
     DECK_TTL_DAYS   optional, delete shared decks after this many days
   ========================================================== */

import { MAX_BODY_BYTES, ValidationError, normalizeDeck } from './deck.js';

/* No look-alike characters (0/O, 1/l/I) so ids are easy to read out loud. */
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const ID_LENGTH = 8;
const ID_PATTERN = /^[A-Za-z0-9]{6,16}$/;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const url = new URL(request.url);

      if (url.pathname === '/api/health') {
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === '/api/decks' && request.method === 'POST') {
        return await createDeck(request, env, cors);
      }

      const deckRoute = url.pathname.match(/^\/api\/decks\/([^/]+)$/);
      if (deckRoute && request.method === 'GET') {
        return await getDeck(deckRoute[1], env, cors);
      }

      return json({ error: 'Not found.' }, 404, cors);
    } catch (error) {
      console.error('Unexpected error', error);
      return json({ error: 'Something went wrong on the server.' }, 500, cors);
    }
  }
};

/* ---- Routes ---- */

async function createDeck(request, env, cors) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return json({ error: 'Send the deck as JSON.' }, 415, cors);
  }

  const tooLarge = json({ error: 'This deck is too large to share.' }, 413, cors);
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) return tooLarge;

  const rawBody = await readBodyWithLimit(request, MAX_BODY_BYTES);
  if (rawBody === null) return tooLarge;

  let input;
  try {
    input = JSON.parse(rawBody);
  } catch (error) {
    return json({ error: 'The request was not valid JSON.' }, 400, cors);
  }

  let deck;
  try {
    deck = normalizeDeck(input);
  } catch (error) {
    if (error instanceof ValidationError) return json({ error: error.message }, 400, cors);
    throw error;
  }

  const id = await createUniqueId(env.DECKS);
  const options = {};
  const ttlDays = Number(env.DECK_TTL_DAYS);
  if (ttlDays > 0) options.expirationTtl = Math.round(ttlDays * 86400);

  await env.DECKS.put(id, JSON.stringify(deck), options);
  return json({ id }, 201, cors);
}

async function getDeck(id, env, cors) {
  if (!ID_PATTERN.test(id)) return json({ error: 'Not found.' }, 404, cors);

  const stored = await env.DECKS.get(id);
  if (stored === null) return json({ error: 'Not found.' }, 404, cors);

  /* A saved deck never changes, so browsers may keep it for a few minutes. */
  return new Response(stored, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

/* ---- Helpers ---- */

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

/* Browsers only let a website call this API if the answer says it may. */
function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGIN || '*').split(',').map(origin => origin.trim());
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };

  if (allowed.includes('*')) headers['Access-Control-Allow-Origin'] = '*';
  else if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

/* Read the request body, giving up (null) as soon as it passes `limit` bytes. */
async function readBodyWithLimit(request, limit) {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/* Random id, retried in the (very unlikely) case it already exists. */
async function createUniqueId(kv) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomId();
    if ((await kv.get(id)) === null) return id;
  }
  throw new Error('Could not create a unique id');
}

/* Uses crypto randomness. Bytes of 232 or more are skipped so every
   character of the alphabet is equally likely (232 = 58 * 4). */
function randomId() {
  let id = '';
  while (id.length < ID_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
    for (const byte of bytes) {
      if (byte < 232 && id.length < ID_LENGTH) id += ID_ALPHABET[byte % ID_ALPHABET.length];
    }
  }
  return id;
}

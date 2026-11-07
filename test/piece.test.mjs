// Runs the built piece's actions against a local stand-in for the API (no network).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const seen = [];
let server, piece;

before(async () => {
  server = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    seen.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('latin1') });
    const reply = (s, j) => res.writeHead(s, { 'content-type': 'application/json' }).end(JSON.stringify(j));
    if (req.headers.authorization !== 'Bearer rs_ap') return reply(401, { message: 'Invalid API key', error_code: 'UNAUTHORIZED' });
    const path = req.url.split('?')[0];
    if (path === '/v1/me') return reply(200, { email: 'me@example.com' });
    if (path === '/v1/profiles') return reply(200, { profiles: [{ username: 'acme', display_name: 'Acme', social_accounts: { x: { a: 1 }, tiktok: '' } }] });
    if (path === '/v1/posts/text') return reply(202, { success: true, request_id: 'req_1' });
    if (path === '/v1/posts/status') return reply(200, { status: 'completed', results: [{ platform: 'x', success: true, url: 'https://x.com/1' }] });
    if (path === '/v1/posts/video') return reply(202, { success: true, job_id: 'job_1' });
    reply(200, { ok: true, path });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.REELSPAN_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  piece = require('../dist/src/index.js').reelspan;
});
after(() => server.close());

const auth = { type: 'SECRET_TEXT', secret_text: 'rs_ap' };
const action = (name) => piece.getAction(name);
const run = (name, propsValue, extra = {}) => action(name).run({ auth, propsValue, run: { id: 'run_9' }, step: { name: 'step_1' }, ...extra });

test('the piece lists every action', () => {
  const names = Object.keys(piece.actions());
  assert.equal(names.length, 13);
  for (const n of ['publish_video', 'publish_photos', 'publish_text', 'publish_document', 'get_status', 'retry_post', 'list_profiles', 'custom_api_call']) assert.ok(names.includes(n), n);
});

test('the key is checked when connecting', async () => {
  assert.deepEqual(await piece.auth.validate({ auth: 'rs_ap' }), { valid: true });
  const bad = await piece.auth.validate({ auth: { secret_text: 'nope' } });
  assert.equal(bad.valid, false);
  assert.match(bad.error, /refused/);
});

test('publish text waits and is idempotent per run and step', async () => {
  const r = await run('publish_text', { profile: 'acme', platforms: ['x', 'bluesky'], text: 'Hello', settings: { x_reply_settings: 'following' }, wait: true });
  assert.deepEqual(r, { request_id: 'req_1', status: 'completed', results: [{ platform: 'x', success: true, url: 'https://x.com/1' }] });
  const sent = seen.find((s) => s.url === '/v1/posts/text');
  assert.equal(sent.headers['idempotency-key'], 'ap-run_9-step_1');
  const body = JSON.parse(sent.body);
  assert.deepEqual(body.platform, ['x', 'bluesky']);
  assert.equal(body.x_reply_settings, 'following');
});

test('publish video from a file, scheduled', async () => {
  const r = await run('publish_video', { profile: 'acme', platforms: ['tiktok'], video: { filename: 'clip.mp4', data: Buffer.from('VID') }, caption: 'Launch', scheduled_date: '2026-12-01T09:00:00.000Z' });
  assert.equal(r.job_id, 'job_1');
  const body = seen.findLast((s) => s.url === '/v1/posts/video').body;
  assert.match(body, /filename="clip.mp4"/);
  assert.match(body, /name="scheduled_date"\r\n\r\n2026-12-01T09:00:00.000Z/);
});

test('profile dropdown shows connected networks', async () => {
  const opts = await action('publish_text').props.profile.options({ auth }, {});
  assert.deepEqual(opts.options, [{ label: 'Acme (x)', value: 'acme' }]);
  const none = await action('publish_text').props.profile.options({ auth: undefined }, {});
  assert.equal(none.disabled, true);
});

test('missing media is a clear error', async () => {
  await assert.rejects(run('publish_video', { profile: 'acme', platforms: ['tiktok'] }), /video file or a video URL/);
});

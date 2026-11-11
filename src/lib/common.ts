import { PieceAuth, Property } from '@activepieces/pieces-framework';
import { Reelspan, ReelspanError, type FileInput } from 'reelspan';

export const VERSION = '0.1.0';
export const BASE_URL = 'https://api.reelspan.com';

export const PLATFORMS: { label: string; value: string }[] = [
  ['TikTok', 'tiktok'], ['YouTube', 'youtube'], ['Instagram', 'instagram'], ['Facebook', 'facebook'], ['X (Twitter)', 'x'], ['Threads', 'threads'],
  ['LinkedIn', 'linkedin'], ['Pinterest', 'pinterest'], ['Bluesky', 'bluesky'], ['Reddit', 'reddit'], ['Google Business', 'google_business'],
  ['Telegram', 'telegram'], ['Discord', 'discord'], ['Slack', 'slack'], ['Mastodon', 'mastodon'],
  ['Dev.to', 'devto'], ['Hashnode', 'hashnode'], ['WordPress', 'wordpress'], ['Sandbox (test)', 'sandbox'],
].map(([label, value]) => ({ label, value }));

/** The connection's secret, whether Activepieces passes it as a string (older) or { secret_text } (newer). */
export const keyOf = (auth: unknown): string => (typeof auth === 'string' ? auth : String((auth as { secret_text?: string })?.secret_text ?? ''));

export const client = (auth: unknown) => new Reelspan({ apiKey: keyOf(auth), baseUrl: process.env.REELSPAN_BASE_URL || BASE_URL, headers: { 'x-reelspan-client': `activepieces/${VERSION}` } });

export const reelspanAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  required: true,
  description: 'Create an API key in the Reelspan dashboard under **API keys** (https://app.reelspan.com/dashboard/api-keys).',
  validate: async ({ auth }) => {
    try {
      await client(auth).me();
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof ReelspanError && err.status === 401 ? 'Reelspan refused this API key.' : `Could not check the key: ${(err as Error).message}` };
    }
  },
});

export const profileProp = (required = true) =>
  Property.Dropdown({
    auth: reelspanAuth,
    displayName: 'Profile',
    description: 'The profile whose connected accounts post',
    required,
    refreshers: [],
    options: async ({ auth }) => {
      if (!auth) return { disabled: true, options: [], placeholder: 'Connect your Reelspan account first' };
      try {
        const r = await client(auth).profiles.list();
        return {
          disabled: false,
          options: r.profiles.map((p) => {
            const nets = Object.entries(p.social_accounts ?? {}).filter(([, v]) => v).map(([k]) => k);
            return { label: `${p.display_name ?? p.username} (${nets.join(', ') || 'no accounts'})`, value: p.username };
          }),
        };
      } catch (err) {
        return { disabled: true, options: [], placeholder: `Could not load profiles: ${(err as Error).message}` };
      }
    },
  });

export const platformsProp = () => Property.StaticMultiSelectDropdown({ displayName: 'Networks', required: true, options: { options: PLATFORMS } });

/** Options every publish action shares. */
export const postProps = () => ({
  scheduled_date: Property.DateTime({ displayName: 'Schedule For', description: 'Publish at this time instead of now', required: false }),
  timezone: Property.ShortText({ displayName: 'Timezone', description: 'IANA timezone for the scheduled time, e.g. America/New_York', required: false }),
  add_to_queue: Property.Checkbox({ displayName: 'Add to Queue', description: 'Take the profile’s next free queue slot', required: false, defaultValue: false }),
  first_comment: Property.ShortText({ displayName: 'First Comment', required: false }),
  settings: Property.Json({ displayName: 'Network Settings', description: 'Any other API field, e.g. {"privacy_level": "PUBLIC_TO_EVERYONE", "reddit_subreddit": "videos"}. Upload-Post field names work too.', required: false }),
  wait: Property.Checkbox({ displayName: 'Wait for Results', description: 'Wait until every network has finished and return each result', required: false, defaultValue: true }),
});

type PostValues = { profile: string; platforms: string[]; scheduled_date?: string; timezone?: string; add_to_queue?: boolean; first_comment?: string; settings?: unknown; wait?: boolean };

export function common(v: PostValues, runId?: string, title?: string) {
  return {
    user: v.profile,
    platforms: v.platforms,
    title,
    scheduledDate: v.scheduled_date || undefined,
    timezone: v.timezone || undefined,
    addToQueue: !!v.add_to_queue,
    firstComment: v.first_comment || undefined,
    extra: (v.settings && typeof v.settings === 'object' ? v.settings : undefined) as Record<string, string>,
    // the same flow run and step never posts twice, even if Activepieces retries it
    idempotencyKey: runId ? `ap-${runId}` : undefined,
    async: v.wait !== false,
  };
}

export async function finish(c: Reelspan, r: Record<string, any>, wait: boolean | undefined) {
  if (wait === false || r.job_id || !r.request_id || (r.results && Object.keys(r.results).length)) return r;
  return { request_id: r.request_id, ...(await c.posts.wait(r.request_id, { timeoutMs: 280_000 })) };
}

/** An Activepieces file (or URL text) as what the client takes. */
export function fileOf(file: { filename: string; data: Buffer } | undefined, url: string | undefined): FileInput | undefined {
  if (file?.data) return { data: new Uint8Array(file.data), name: file.filename };
  return url || undefined;
}

export const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : String(v ?? '').split(/[\n,]/)).map((s) => s.trim()).filter(Boolean);

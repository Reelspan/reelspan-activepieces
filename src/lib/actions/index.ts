import { createAction, Property } from '@activepieces/pieces-framework';
import { PLATFORMS, client, common, fileOf, finish, list, platformsProp, postProps, profileProp, reelspanAuth } from '../common';

const runKey = (ctx: { run?: { id?: string }; step?: { name?: string } }) => (ctx.run?.id ? `${ctx.run.id}-${ctx.step?.name ?? ''}` : undefined);

export const publishVideo = createAction({
  auth: reelspanAuth,
  name: 'publish_video',
  displayName: 'Publish Video',
  description: 'Publish or schedule a video to TikTok, YouTube, Instagram, Facebook, X, LinkedIn and more',
  props: {
    profile: profileProp(),
    platforms: platformsProp(),
    video: Property.File({ displayName: 'Video File', description: 'A file from an earlier step', required: false }),
    video_url: Property.ShortText({ displayName: 'Video URL', description: 'Or a public link (Google Drive and Dropbox share links work)', required: false }),
    caption: Property.LongText({ displayName: 'Caption', description: 'Caption, or the YouTube title', required: false }),
    description: Property.LongText({ displayName: 'Description', description: 'Longer description where the network has one', required: false }),
    ...postProps(),
  },
  async run(ctx) {
    const v = ctx.propsValue;
    const video = fileOf(v.video ?? undefined, v.video_url ?? undefined);
    if (!video) throw new Error('Give a video file or a video URL.');
    const c = client(ctx.auth);
    const r = await c.posts.video({ ...common(v as never, runKey(ctx as never), v.caption ?? undefined), description: v.description ?? undefined, video });
    return finish(c, r, v.wait ?? undefined);
  },
});

export const publishPhotos = createAction({
  auth: reelspanAuth,
  name: 'publish_photos',
  displayName: 'Publish Photos',
  description: 'Publish or schedule one photo or a carousel to Instagram, TikTok, Facebook, X, LinkedIn, Pinterest and more',
  props: {
    profile: profileProp(),
    platforms: platformsProp(),
    photo_urls: Property.Array({ displayName: 'Photo URLs', description: 'Public links, in carousel order', required: false }),
    photo: Property.File({ displayName: 'Photo File', description: 'Or one file from an earlier step', required: false }),
    caption: Property.LongText({ displayName: 'Caption', required: false }),
    alt_texts: Property.Array({ displayName: 'Alt Texts', description: 'One per photo, in order', required: false }),
    ...postProps(),
  },
  async run(ctx) {
    const v = ctx.propsValue;
    const photos = [...(v.photo ? [fileOf(v.photo, undefined)!] : []), ...list(v.photo_urls)];
    if (!photos.length) throw new Error('Give photo URLs or a photo file.');
    const c = client(ctx.auth);
    const alts = list(v.alt_texts);
    const r = await c.posts.photos({ ...common(v as never, runKey(ctx as never), v.caption ?? undefined), photos, altTexts: alts.length ? alts : undefined });
    return finish(c, r, v.wait ?? undefined);
  },
});

export const publishText = createAction({
  auth: reelspanAuth,
  name: 'publish_text',
  displayName: 'Publish Text',
  description: 'Publish or schedule a text post to X, Threads, LinkedIn, Bluesky, Facebook, Mastodon, Discord, Telegram and more',
  props: {
    profile: profileProp(),
    platforms: platformsProp(),
    text: Property.LongText({ displayName: 'Text', description: 'Long text becomes a thread on X and Bluesky', required: true }),
    ...postProps(),
  },
  async run(ctx) {
    const v = ctx.propsValue;
    const c = client(ctx.auth);
    return finish(c, await c.posts.text(common(v as never, runKey(ctx as never), v.text)), v.wait ?? undefined);
  },
});

export const publishDocument = createAction({
  auth: reelspanAuth,
  name: 'publish_document',
  displayName: 'Publish Document',
  description: 'Publish a PDF to LinkedIn as a swipeable document',
  props: {
    profile: profileProp(),
    document: Property.File({ displayName: 'Document File', required: false }),
    document_url: Property.ShortText({ displayName: 'Document URL', required: false }),
    title: Property.ShortText({ displayName: 'Title', required: true }),
    ...postProps(),
  },
  async run(ctx) {
    const v = ctx.propsValue;
    const document = fileOf(v.document ?? undefined, v.document_url ?? undefined);
    if (!document) throw new Error('Give a document file or a document URL.');
    const c = client(ctx.auth);
    const r = await c.posts.document({ ...common({ ...(v as unknown as Record<string, never>), platforms: ['linkedin'] } as never, runKey(ctx as never), v.title), document });
    return finish(c, r, v.wait ?? undefined);
  },
});

export const getStatus = createAction({
  auth: reelspanAuth,
  name: 'get_status',
  displayName: 'Get Post Status',
  description: 'Each network’s result and link, by request ID (or job ID for a scheduled post)',
  props: { id: Property.ShortText({ displayName: 'Request ID or Job ID', required: true }) },
  async run(ctx) {
    const id = ctx.propsValue.id.trim();
    return client(ctx.auth).posts.status(/^job/i.test(id) ? { jobId: id } : { requestId: id });
  },
});

export const retryPost = createAction({
  auth: reelspanAuth,
  name: 'retry_post',
  displayName: 'Retry Failed Networks',
  description: 'Send the networks that failed again, with the media Reelspan already has',
  props: {
    request_id: Property.ShortText({ displayName: 'Request ID', required: true }),
    platforms: Property.StaticMultiSelectDropdown({ displayName: 'Only These Networks', description: 'Leave empty for every failed network', required: false, options: { options: PLATFORMS } }),
  },
  async run(ctx) {
    const platforms = list(ctx.propsValue.platforms);
    return client(ctx.auth).posts.retry(ctx.propsValue.request_id, platforms.length ? { platforms } : {});
  },
});

export const listProfiles = createAction({
  auth: reelspanAuth,
  name: 'list_profiles',
  displayName: 'List Profiles',
  description: 'Every profile and its connected networks',
  props: {},
  async run(ctx) {
    return (await client(ctx.auth).profiles.list()).profiles;
  },
});

export const getHistory = createAction({
  auth: reelspanAuth,
  name: 'get_history',
  displayName: 'Get Post History',
  description: 'Recent posts, one row per network',
  props: {
    profile: profileProp(false),
    platform: Property.ShortText({ displayName: 'Network', required: false }),
    status: Property.StaticDropdown({ displayName: 'Status', required: false, options: { options: [{ label: 'Success', value: 'success' }, { label: 'Failed', value: 'failed' }] } }),
    limit: Property.StaticDropdown({ displayName: 'Limit', required: false, defaultValue: 20, options: { options: [10, 20, 50, 100].map((n) => ({ label: String(n), value: n })) } }),
  },
  async run(ctx) {
    const v = ctx.propsValue;
    const r = await client(ctx.auth).posts.history({ profile_username: v.profile || undefined, platform: v.platform || undefined, status: (v.status as 'success' | 'failed') || undefined, limit: (v.limit as 20) || 20 });
    return r.history;
  },
});

export const getAnalytics = createAction({
  auth: reelspanAuth,
  name: 'get_analytics',
  displayName: 'Get Analytics',
  description: 'Followers, reach and engagement of a profile; day by day with Days; or one post with Request ID',
  props: {
    profile: profileProp(false),
    days: Property.Number({ displayName: 'Days', description: 'Day-by-day history of this many days', required: false }),
    request_id: Property.ShortText({ displayName: 'Post Request ID', description: 'One post’s numbers instead', required: false }),
  },
  async run(ctx) {
    const v = ctx.propsValue;
    const c = client(ctx.auth);
    if (v.request_id) return c.analytics.post(v.request_id);
    if (!v.profile) throw new Error('Choose a profile (or give a post request ID).');
    return v.days ? c.analytics.history(v.profile, { days: v.days }) : c.analytics.account(v.profile);
  },
});

export const listScheduled = createAction({
  auth: reelspanAuth,
  name: 'list_scheduled',
  displayName: 'List Scheduled Posts',
  description: 'Posts waiting for their time',
  props: { profile: profileProp(false) },
  async run(ctx) {
    return client(ctx.auth).scheduled.list({ profile_username: ctx.propsValue.profile || undefined });
  },
});

export const cancelScheduled = createAction({
  auth: reelspanAuth,
  name: 'cancel_scheduled',
  displayName: 'Cancel Scheduled Post',
  description: 'Cancel a scheduled post so it is never published',
  props: {
    job_id: Property.ShortText({ displayName: 'Job ID', required: true }),
    with_later_repeats: Property.Checkbox({ displayName: 'Also Cancel Later Repeats', required: false, defaultValue: false }),
  },
  async run(ctx) {
    return client(ctx.auth).scheduled.cancel(ctx.propsValue.job_id, { withLaterRepeats: !!ctx.propsValue.with_later_repeats });
  },
});

export const writeCaptions = createAction({
  auth: reelspanAuth,
  name: 'write_captions',
  displayName: 'Write Captions with AI',
  description: 'A caption for each network from a short description (one Reelspan AI credit)',
  props: {
    text: Property.LongText({ displayName: 'About the Post', required: true }),
    platforms: platformsProp(),
    language: Property.ShortText({ displayName: 'Language', description: 'e.g. en, es, de', required: false }),
  },
  async run(ctx) {
    const v = ctx.propsValue;
    return client(ctx.auth).ai.writeCaptions({ text: v.text, platforms: v.platforms, language: v.language || undefined, kind: 'text' });
  },
});

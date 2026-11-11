# Reelspan for Activepieces

An [Activepieces](https://www.activepieces.com) piece for [Reelspan](https://reelspan.com): publish videos, photos,
text and PDFs to TikTok, YouTube, Instagram, Facebook, X, Threads, LinkedIn, Pinterest, Bluesky, Reddit and more
networks from your flows, then check results and read analytics.

## Install

**Self-hosted or Activepieces Cloud (platform admins):** Platform admin → Pieces → **Install Piece** → npm package
`@reelspan/activepieces-piece`.

Then add a **Reelspan** connection with an API key from the Reelspan dashboard (**API keys**). The key is checked
before it is saved.

## Actions

| Action | |
|---|---|
| Publish Video | From a file of an earlier step or a public URL (Drive and Dropbox links work) |
| Publish Photos | One photo or a carousel, with alt text |
| Publish Text | Long text becomes a thread on X and Bluesky |
| Publish Document | A PDF as a LinkedIn document |
| Get Post Status | Each network's result and link |
| Retry Failed Networks | Resend only what failed |
| List Profiles | Profiles and their connected networks |
| Get Post History | Recent posts |
| Get Analytics | Profile numbers, day-by-day history, or one post |
| List Scheduled Posts / Cancel Scheduled Post | The schedule |
| Write Captions with AI | A caption for each network |
| Custom API Call | Any Reelspan endpoint, authenticated |

Publish actions take a schedule time and timezone, the queue, a first comment and **Network Settings** (JSON) for any
other API field (Upload-Post field names work too). They wait for every network by default. Each flow run and step
gets its own idempotency key, so a retried step never double-posts.

## Example flows

- **New file in Google Drive → TikTok, Reels and Shorts:** Google Drive *New File* → Reelspan *Publish Video*.
- **New blog post → LinkedIn and X:** RSS *New Item* → Reelspan *Write Captions with AI* → Reelspan *Publish Text*.
- **Weekly numbers to Slack:** Schedule → Reelspan *Get Analytics* → Slack *Send Message*.

## Develop

```bash
npm ci
npm test
```

The piece is written against `@activepieces/pieces-framework` 0.32 and can be copied into
`packages/pieces/community/reelspan` of the Activepieces repository as is.

## Links

[API reference](https://reelspan.com/docs) · [Node SDK](https://github.com/Reelspan/reelspan-node)

MIT licensed. Security reports: see [SECURITY.md](SECURITY.md).

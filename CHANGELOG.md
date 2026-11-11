# Changelog

## 0.1.1

- Dropped Whop, Listmonk, Nostr and Lemmy, which Reelspan no longer supports.

## 0.1.0

First release.

- Actions: Publish Video, Publish Photos, Publish Text, Publish Document (files from earlier steps or URLs; now,
  scheduled or queued; first comment; any network setting), Get Post Status, Retry Failed Networks, List Profiles,
  Get Post History, Get Analytics, List Scheduled Posts, Cancel Scheduled Post, Write Captions with AI, Custom API Call.
- A profile dropdown that shows each profile's connected networks; the API key is checked when you connect.
- Posts wait for each network's result, and one idempotency key per flow run and step means a retried step never
  double-posts.

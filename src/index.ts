import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import * as actions from './lib/actions';
import { BASE_URL, keyOf, reelspanAuth } from './lib/common';

export { reelspanAuth };

export const reelspan = createPiece({
  displayName: 'Reelspan',
  description: 'Publish videos, photos, text and PDFs to TikTok, YouTube, Instagram, X, LinkedIn and 17 more networks',
  auth: reelspanAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://reelspan.com/icon.svg',
  categories: [PieceCategory.MARKETING, PieceCategory.CONTENT_AND_FILES],
  authors: ['reelspan'],
  actions: [
    actions.publishVideo,
    actions.publishPhotos,
    actions.publishText,
    actions.publishDocument,
    actions.getStatus,
    actions.retryPost,
    actions.listProfiles,
    actions.getHistory,
    actions.getAnalytics,
    actions.listScheduled,
    actions.cancelScheduled,
    actions.writeCaptions,
    createCustomApiCallAction({
      auth: reelspanAuth,
      baseUrl: () => `${process.env.REELSPAN_BASE_URL || BASE_URL}/v1`,
      authMapping: async (auth) => ({ Authorization: `Bearer ${keyOf(auth)}` }),
    }),
  ],
  triggers: [],
});

/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import isBot from 'isbot';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {type PresentationData} from './presentation';

initializeApp();
const db = getFirestore();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info('Hello logs!', {structuredData: true});
//   response.send('Hello from Firebase!');
// });

export const renderForBot = onRequest(
  {region: 'europe-west1'},
  async (request, response) => {
    if (!isBot(request.get('user-agent'))) {
      logger.info('not bot');
      response.redirect(`/r${request.url}`);
      return;
    }

    logger.info('bot', {userAgent: request.get('user-agent')});

    const presentationId = request.path.split('/')[2];

    if (presentationId === undefined) {
      logger.warn('unable to parse presentation id', {path: request.path});
      response.redirect(`/r${request.url}`);
      return;
    }

    const presentationPageIndex = Math.max(
      Number.parseInt((request.query.slide as string | undefined) ?? '0', 10) -
        1,
      0,
    );

    const presentationSnapshot = await db
      .collection('presentations')
      .doc(presentationId)
      .get();

    const presentationData = presentationSnapshot.data() as PresentationData;

    const pageUrl =
      presentationData.pages[presentationPageIndex] ??
      presentationData.pages[0] ??
      '';

    response
      .setHeader('cache-control', 'public, max-age=3600, immutable')
      .status(200).send(`
  <!DOCTYPE html>
  <html lang="en">
  <meta charset="UTF-8" />
  <head>
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Inspired from: https://css-tricks.com/essential-meta-tags-social-media/#aa-final-markup -->
  <!--  Essential META Tags -->
  <meta property="og:title" content="Slidr.app - ${presentationData.title}">
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${pageUrl}">
  <meta property="og:url" content="https://slidr.app/${
    // Keep the prefix (p or f) for now.
    // TODO: maybe one day there will be a browser (non presentation) view
    request.url.split('/')[1]
  }/${presentationId}${
      request.query.slide === undefined
        ? ''
        : '?slide=' + String(request.query.slide)
    }">
  <meta name="twitter:card" content="summary_large_image">
  <!--  Non-Essential, But Recommended -->
  <meta property="og:description" content="Interactive presentations, for free.">
  <meta property="og:site_name" content="Slidr.app">
  <meta name="twitter:image:alt" content="${presentationData.title}">
  </head>
  <body>
    <h1>${presentationData.title}</h1>
    <p>by ${presentationData.username}</p>
    <img src="${pageUrl}" />
  </body>
  </html>
  `);
  },
);

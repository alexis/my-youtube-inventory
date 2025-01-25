#!/usr/bin/env node

import './warning-workaround.js';

import { acquireAuth, YouTube, VideoCollection } from '#src/index.js';
import Configuration from '#src/configuration.js';

const MAX_ITEMS = 5;

(async () => {
  const configuration = new Configuration();
  const auth = await acquireAuth(configuration.auth);
  const youtube = new YouTube(auth);
  const collection = new VideoCollection();

  console.log(`Fetching ${MAX_ITEMS} items (making sure things are working):`);
  let processed_items = 0;

  const abort_controller = new AbortController();

  youtube.on('playlist:item', item => {
    if (processed_items++ < MAX_ITEMS) {
      collection.addItem(item);
    } else {
      abort_controller.abort();
    }
  });
  youtube.on('playlist:start', playlistId => console.log('Started playlist', playlistId));
  youtube.on('playlist:complete', playlistId => console.log('Completed', playlistId));
  youtube.on('playlist:abort', playlistId => console.log('Aborted', playlistId));
  youtube.on('playlists:start', () => console.time('Execution Time'));
  youtube.on('playlists:complete', () => console.timeEnd('Execution Time'));

  await youtube.processPlaylistItems(undefined, abort_controller.signal);

  console.log('\nExtracted sample:');
  for (const video of collection.iterator()) {
    console.log(`${video.videoId} ${video.playlistIds().join(':')} ${video.title}`);
  }
})();

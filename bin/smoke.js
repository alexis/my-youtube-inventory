#!/usr/bin/env node

import './warning-workaround.js';

import {
  interactivelyAcquireAuth,
  YoutubeAdapter,
  YoutubeEventer,
  VideoCollection,
  Configuration,
} from '../src/index.js';

const MAX_ITEMS = 5;

(async () => {
  const configuration = new Configuration();
  const auth = await interactivelyAcquireAuth(configuration.auth);
  const youtube = new YoutubeAdapter(auth);
  const eventer = new YoutubeEventer(youtube);
  const collection = new VideoCollection();

  console.log(`Fetching ${MAX_ITEMS} items (making sure things are working):`);
  let processed_items = 0;

  const abort_controller = new AbortController();

  eventer.on('playlist:item', item => {
    if (processed_items++ < MAX_ITEMS) {
      collection.addItem(item);
    } else {
      abort_controller.abort();
    }
  });
  eventer.on('playlist:start', playlistId => console.log('Started playlist', playlistId));
  eventer.on('playlist:complete', playlistId => console.log('Completed', playlistId));
  eventer.on('playlist:abort', playlistId => console.log('Aborted', playlistId));
  eventer.on('playlists:start', () => console.time('Execution Time'));
  eventer.on('playlists:complete', () => console.timeEnd('Execution Time'));

  await eventer.processPlaylistItems(undefined, abort_controller.signal);

  console.log('\nExtracted sample:');
  for (const video of collection.iterator()) {
    console.log(`${video.videoId} ${video.playlistIds().join(':')} ${video.title}`);
  }
})();

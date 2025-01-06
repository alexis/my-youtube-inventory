#!/usr/bin/env node

import './warning-workaround.js';
import 'dotenv/config';

import { program } from 'commander';
import { createWriteStream, existsSync, writeFileSync } from 'fs';
import { Console } from 'console';
import { stringify } from 'csv-stringify';

import { acquireAuth, YouTube, VideoCollection } from '#src/index.js';
import CategoriesRegistry from '#src/categories-registry.js';

const CATEGORIES_FILE = process.env.MYTI_CATEGORIES_FILE || 'categories.json';

program
  .option('-o, --output <file>', 'output CSV file name', 'yt-inventory.csv')
  .option('-m, --max <number>', 'maximum number of items to fetch', parseInt, 0)
  .option(
    '--dump-categories [file]',
    `fetch playlists and dump them as categories (default: "${CATEGORIES_FILE}")`,
  )
  .option('--stdout', 'output to stdout instead of a file')
  .option('--force', 'overwrite existing output file')
  .parse();

const opts = program.opts();

(async () => {
  try {
    const auth = await acquireAuth();
    const youtube = new YouTube(auth);
    const categories = new CategoriesRegistry();
    const collection = new VideoCollection();

    categories.tryAddCategoriesFromFile(CATEGORIES_FILE);

    const console = new Console({ stdout: process.stderr, stderr: process.stderr });

    if (opts.dumpCategories !== undefined) {
      const playlists = await youtube.fetchPlaylists();
      categories.addPlaylistsAsNewCategories(playlists);

      const categoriesJSON = JSON.stringify(categories, null, 2);

      if (opts.stdout) {
        console.log(categoriesJSON);
      } else {
        const file = opts.dumpCategories === true ? CATEGORIES_FILE : opts.dumpCategories;
        if (existsSync(file) && !opts.force) {
          console.error(`File ${file} already exists. Use --force to overwrite.`);
          process.exit(1);
        }
        writeFileSync(file, categoriesJSON);
        console.log(`Categories dumped to ${file}`);
      }
      process.exit(0);
    }

    if (opts.dump)
      if (existsSync(opts.output) && !opts.force && !opts.stdout) {
        console.error(`File ${opts.output} already exists. Use --force to overwrite.`);
        process.exit(1);
      }

    console.log(`Fetching ${opts.max || 'all'} playlist items...`);

    let processedItems = 0;
    const abortController = new AbortController();

    youtube.on('playlist:item', item => {
      if (!opts.max || processedItems < opts.max) {
        collection.addItem(item);
        processedItems++;
        if (processedItems % 50 == 0) console.log(`Fetched ${processedItems}...`);
      } else {
        abortController.abort();
      }
    });

    youtube.on('playlists:start', () => console.time('Execution Time'));
    youtube.on('playlists:complete', () => console.timeEnd('Execution Time'));

    await youtube.processPlaylistItems(categories, abortController.signal);

    console.log(`\nExtracted ${collection.size()} videos`);

    const stringifier = stringify({
      columns: ['video_id', 'categories', 'channel_title', 'title', 'description'],
      header: true,
      delimiter: '\t',
    });

    if (opts.stdout) {
      stringifier.pipe(process.stdout);
    } else {
      const fileStream = createWriteStream(opts.output);

      fileStream.on('finish', () => console.log(`Youtube listing saved as ${opts.output}`));

      stringifier.pipe(fileStream);
    }

    for (const video of collection.iterator()) {
      stringifier.write({
        video_id: video.videoId,
        categories: video
          .playlistIds()
          .map(id => categories.getById(id).label)
          .join(':'),
        title: video.title,
        channel_title: video.channelTitle,
        description: video.description?.replace(/\n/g, '\\n'),
      });
    }

    stringifier.end();
  } catch (error) {
    console.error('Error occurred:', error);
  }
})();

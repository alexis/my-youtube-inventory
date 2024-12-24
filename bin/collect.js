#!/usr/bin/env node

import "#src/warning-workaround.js";
import "dotenv/config";

import { program } from "commander";
import { createObjectCsvWriter } from "csv-writer";

import Credentials from "#src/credentials.js";
import YouTube from "#src/youtube.js";
import VideoCollection from "#src/video-collection.js";

program
  .option("-o, --output <file>", "output CSV file name", "videos.csv")
  .option("-m, --max <number>", "maximum number of items to fetch", 0)
  .parse(process.argv);

const opts = program.opts();

(async () => {
  try {
    const auth = await Credentials.acquire();
    const collection = new VideoCollection();
    const youtube = new YouTube(auth);

    console.log(`Fetching ${opts.max || "all"} playlist items...`);

    let processedItems = 0;
    const abortController = new AbortController();

    youtube.on("playlist:item", (item) => {
      if (!opts.max || processedItems < opts.max) {
        collection.addItem(item);
        processedItems++;
        if (processedItems % 50 == 0) {
          console.log(`Fetched ${processedItems}...`);
        }
      } else {
        abortController.abort();
      }
    });

    youtube.on("playlists:start", () => console.time("Execution Time"));
    youtube.on("playlists:complete", () => console.timeEnd("Execution Time"));

    await youtube.processPlaylistItems(abortController.signal);

    console.log(`\nExtracted ${collection.size()} videos`);

    // Prepare CSV data
    const csvWriter = createObjectCsvWriter({
      path: opts.output,
      header: [
        { id: "videoId", title: "video_id" },
        { id: "playlists", title: "playlist_ids" },
        { id: "title", title: "title" },
        { id: "description", title: "description" },
      ],
    });

    const records = collection.iterator().map((video) => ({
      videoId: video.videoId,
      title: video.title,
      playlists: video.playlists().join(":"),
      description: video.description.replace(/\n/g, "\\n"),
    }));

    await csvWriter.writeRecords(records);
    console.log(`CSV file saved as ${opts.output}`);
  } catch (error) {
    console.error("Error occurred:", error);
  }
})();

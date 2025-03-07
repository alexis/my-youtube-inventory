import pLimit from 'p-limit';
import { EventEmitter } from 'events';
import CategoriesRegistry from './categories-registry.js';
import YoutubeAdapter, { type PlaylistItem } from './youtube-adapter.js';

const CONCURRENCY_LIMIT = 5;

class YoutubeEventer extends EventEmitter {
  private youtube: YoutubeAdapter;
  private limitter: ReturnType<typeof pLimit>;

  constructor(youtube: YoutubeAdapter, concurrencyLimit: number = CONCURRENCY_LIMIT) {
    super();

    this.youtube = youtube;
    this.limitter = pLimit(concurrencyLimit);
  }

  async processPlaylistItemsFor(playlistId: string, signal?: AbortSignal): Promise<void> {
    let pageToken: string | undefined;
    let playlistItems: PlaylistItem[];

    this.emit('playlist:start', playlistId);

    do {
      if (signal?.aborted) {
        this.emit('playlist:abort', playlistId);
        return;
      }

      this.emit('playlist:page:start', playlistId);

      ({ pageToken, playlistItems } = await this.youtube.fetchPlaylistItems(playlistId, pageToken));

      if (playlistItems) {
        for (const item of playlistItems) {
          if (signal?.aborted) break;
          if (!item.videoId) continue;

          this.emit('playlist:item', item);
        }
      }
    } while (pageToken);

    this.emit('playlist:complete', playlistId);
  }

  async processPlaylistItems(
    categories = new CategoriesRegistry(),
    sig?: AbortSignal,
  ): Promise<void> {
    this.emit('playlists:start');

    const { playlists } = await this.youtube.fetchPlaylists();
    categories.addPlaylistsAsNewCategories(playlists);

    await Promise.all(
      categories
        .syncablePlaylistIds()
        .map(id =>
          this.limitter(() =>
            sig && sig.aborted ? undefined : this.processPlaylistItemsFor(id, sig),
          ),
        ),
    );

    this.emit('playlists:complete');
  }
}

export default YoutubeEventer;

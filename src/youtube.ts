import { youtube_v3, youtube } from '@googleapis/youtube';
import pLimit from 'p-limit';
import { EventEmitter } from 'events';
import PlaylistItem from './playlist-item.js';
import Playlist from './playlist.js';
import { GaxiosResponse } from 'gaxios';
import assert from 'assert';
import CategoriesRegistry from './categories-registry.js';
import { OAuth2Client } from 'google-auth-library';

type PlaylistFromResponse = youtube_v3.Schema$Playlist;
type PlayListItemListResponse = GaxiosResponse<youtube_v3.Schema$PlaylistItemListResponse>;
type PlayListItemFromResponse = youtube_v3.Schema$PlaylistItem;

class YouTube extends EventEmitter {
  private youtubeClient: youtube_v3.Youtube;
  private limit: ReturnType<typeof pLimit>;

  constructor(auth: OAuth2Client) {
    super();

    this.youtubeClient = youtube({ version: 'v3', auth });
    this.limit = pLimit(5);
  }

  async fetchPlaylists(): Promise<Playlist[]> {
    const response = await this.youtubeClient.playlists.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
      maxResults: 50,
    });

    const playlists = response.data.items?.filter(x => !!x.id).map(x => this.wrapPlaylist(x)) ?? [];

    return playlists;
  }

  async processPlaylistItemsFor(playlistId: string, signal?: AbortSignal): Promise<void> {
    let nextPageToken: string | null | undefined = undefined;

    this.emit('playlist:start', playlistId);

    do {
      if (signal?.aborted) {
        this.emit('playlist:abort', playlistId);
        return;
      }

      this.emit('playlist:page:start', playlistId);

      const response: PlayListItemListResponse = await this.youtubeClient.playlistItems.list({
        part: ['snippet'],
        playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
      });

      if (response.data.items) {
        for (const item of response.data.items) {
          if (signal?.aborted) break;
          if (!item.snippet?.resourceId?.videoId) continue;

          this.emit('playlist:item', this.wrapPlaylistItem(item));
        }
      }

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    this.emit('playlist:complete', playlistId);
  }

  async processPlaylistItems(
    categories: CategoriesRegistry = new CategoriesRegistry(),
    sig: AbortSignal,
  ): Promise<void> {
    this.emit('playlists:start');

    const playlists = await this.fetchPlaylists();
    categories.addPlaylistsAsNewCategories(playlists);

    await Promise.all(
      categories
        .syncablePlaylistIds()
        .map(id =>
          this.limit(() => (sig.aborted ? undefined : this.processPlaylistItemsFor(id, sig))),
        ),
    );

    this.emit('playlists:complete');
  }

  private wrapPlaylistItem({ snippet = {} }: PlayListItemFromResponse): PlaylistItem {
    const resourceId = snippet.resourceId;

    assert(snippet.playlistId);
    assert(resourceId?.videoId);

    return new PlaylistItem(
      snippet.playlistId,
      resourceId.videoId,
      resourceId.kind ?? undefined,
      snippet.title ?? undefined,
      snippet.description ?? undefined,
      snippet.publishedAt ?? undefined,
      snippet.videoOwnerChannelTitle ?? undefined,
      snippet.position ?? undefined,
    );
  }

  private wrapPlaylist(playlist: PlaylistFromResponse): Playlist {
    const id = playlist.id;
    const title = playlist.snippet?.title ?? undefined;
    const itemCount = playlist.contentDetails?.itemCount ?? undefined;

    assert(!!id);

    return new Playlist(id, title, itemCount);
  }
}

export default YouTube;

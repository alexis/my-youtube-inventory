import { youtube_v3, youtube } from '@googleapis/youtube';
import pLimit from 'p-limit';
import { EventEmitter } from 'events';
import assert from 'assert';
import CategoriesRegistry from './categories-registry.js';
import { OAuth2Client } from 'google-auth-library';

interface Playlist {
  id: string;
  title?: string;
  itemCount?: number;
}

interface PlaylistItem {
  playlistId: string;
  videoId: string;
  kind?: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  channelTitle?: string;
  position?: number;
}

type PlaylistFromResponse = youtube_v3.Schema$Playlist;
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
    let nextPageToken: string | undefined;

    this.emit('playlist:start', playlistId);

    do {
      if (signal?.aborted) {
        this.emit('playlist:abort', playlistId);
        return;
      }

      this.emit('playlist:page:start', playlistId);

      const response = await this.youtubeClient.playlistItems.list({
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

      nextPageToken = response.data.nextPageToken ?? undefined;
    } while (nextPageToken);

    this.emit('playlist:complete', playlistId);
  }

  async processPlaylistItems(
    categories = new CategoriesRegistry(),
    sig?: AbortSignal,
  ): Promise<void> {
    this.emit('playlists:start');

    const playlists = await this.fetchPlaylists();
    categories.addPlaylistsAsNewCategories(playlists);

    await Promise.all(
      categories
        .syncablePlaylistIds()
        .map(id =>
          this.limit(() =>
            sig && sig.aborted ? undefined : this.processPlaylistItemsFor(id, sig),
          ),
        ),
    );

    this.emit('playlists:complete');
  }

  private wrapPlaylistItem({ snippet = {} }: PlayListItemFromResponse): PlaylistItem {
    const { resourceId = {} } = snippet;

    assert(snippet.playlistId);
    assert(resourceId.videoId);

    return {
      playlistId: snippet.playlistId,
      videoId: resourceId.videoId,
      kind: resourceId.kind ?? undefined,
      title: snippet.title ?? undefined,
      description: snippet.description ?? undefined,
      publishedAt: snippet.publishedAt ?? undefined,
      channelTitle: snippet.videoOwnerChannelTitle ?? undefined,
      position: snippet.position ?? undefined,
    };
  }

  private wrapPlaylist(playlist: PlaylistFromResponse): Playlist {
    const id = playlist.id;
    const title = playlist.snippet?.title ?? undefined;
    const itemCount = playlist.contentDetails?.itemCount ?? undefined;

    assert(id);

    return { id, title, itemCount };
  }
}

export { Playlist, PlaylistItem };
export default YouTube;

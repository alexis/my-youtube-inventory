import { youtube_v3, youtube, type GaxiosPromise } from '@googleapis/youtube';
import assert from 'assert';
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

interface BaseResult {
  etag?: string;
  totalResults?: number;
  pageToken?: string;
  responseStatus: number;
  responseStatusText: string;
}

interface PlaylistsResult extends BaseResult {
  playlists: Playlist[];
}
interface PlaylistItemsResult extends BaseResult {
  playlistItems: PlaylistItem[];
}

type PlaylistFromResponse = youtube_v3.Schema$Playlist;
type PlayListItemFromResponse = youtube_v3.Schema$PlaylistItem;

class YoutubeAdapter {
  private client: youtube_v3.Youtube;

  constructor(auth: OAuth2Client) {
    this.client = youtube({ version: 'v3', auth });
  }

  async fetchPlaylists(pageToken?: string): Promise<PlaylistsResult> {
    const response = await this.client.playlists.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
      maxResults: 50,
      pageToken,
    });

    const playlists = response.data.items?.filter(x => !!x.id).map(x => this.wrapPlaylist(x)) ?? [];

    return this.composeResult({ playlists }, response);
  }

  async fetchPlaylistItems(playlistId: string, pageToken?: string): Promise<PlaylistItemsResult> {
    const response = await this.client.playlistItems.list({
      part: ['snippet'],
      playlistId,
      maxResults: 50,
      pageToken,
    });

    const playlistItems =
      response.data.items?.filter(x => !!x.id).map(x => this.wrapPlaylistItem(x)) ?? [];

    return this.composeResult({ playlistItems }, response);
  }

  private composeResult<T>(
    partialResult: T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: Awaited<GaxiosPromise<any>>,
  ): T & BaseResult {
    return {
      etag: response.data.etag ?? undefined,
      totalResults: response.data.pageInfo?.totalResults ?? undefined,
      pageToken: response.data.nextPageToken ?? undefined,
      responseStatus: response.status,
      responseStatusText: response.statusText,
      ...partialResult,
    };
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

export type { Playlist, PlaylistItem };
export default YoutubeAdapter;

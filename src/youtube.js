import { youtube } from '@googleapis/youtube';
import pLimit from 'p-limit';
import EventEmitter from 'events';
import PlaylistItem from './playlist-item.js';
import Playlist from './playlist.js';

class YouTube extends EventEmitter {
  constructor(auth) {
    super();

    this.auth = auth;
    this.youtubeClient = youtube({ version: 'v3', auth });
    this.limit = pLimit(5);
  }

  async fetchPlaylists() {
    const response = await this.youtubeClient.playlists.list({
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: 50,
    });

    if (response.data.totalResults === 0) {
      return [];
    }

    return response.data.items.map((x) => this.wrapPlaylist(x));
  }

  async processPlaylistItemsFor(playlistId, signal) {
    let nextPageToken = null;

    this.emit('playlist:start', playlistId);

    do {
      if (signal?.aborted) {
        this.emit('playlist:abort', playlistId);
        return []
      }

      this.emit('playlist:page:start', playlistId);
      const response = await this.youtubeClient.playlistItems.list({
        part: 'snippet',
        playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
      });

      if (response.data.items) {
        for (const item of response.data.items) {
          if (signal?.aborted) break;
          this.emit('playlist:item', this.wrapPlaylistItem(item));
        }
      }

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    this.emit('playlist:complete', playlistId);
  }

  async processPlaylistItems(signal) {
    this.emit('playlists:start');

    const playlists = await this.fetchPlaylists();
    await Promise.all(
      playlists.map((playlist) =>
        this.limit(() => !signal.aborted && this.processPlaylistItemsFor(playlist.id, signal))
      )
    );

    this.emit('playlists:complete');
  }

  wrapPlaylistItem(item) {
    const { title, description, publishedAt, playlistId, position, resourceId, videoOwnerChannelTitle } = item.snippet;
    const { videoId, kind } = resourceId;
    return new PlaylistItem({ videoId, kind, title, description, publishedAt, playlistId, position, channelTitle: videoOwnerChannelTitle });
  }

  wrapPlaylist(playlist) {
    return new Playlist({
      id: playlist.id,
      title: playlist.snippet.title,
      itemCount: playlist.contentDetails.itemCount
    })
  }
}

export default YouTube;

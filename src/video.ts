import { type PlaylistItem } from './youtube-adapter.js';

type VideoAttrs = {
  videoId: string;
  title?: string;
  description?: string;
  playlistMemberships: { [index: string]: string | undefined };
  channelTitle?: string;
};

class VideoCollection {
  constructor(public videos: { [index: string]: VideoAttrs } = {}) {}

  addItem(item: PlaylistItem) {
    const vid = item.videoId;

    if (!this.videos[vid]) {
      this.videos[vid] = this.videoAttrs(item);
    } else {
      this.videos[vid].playlistMemberships[item.playlistId] = item.publishedAt;
    }
  }

  videoAttrs(item: PlaylistItem): VideoAttrs {
    return {
      videoId: item.videoId,
      title: item.title,
      description: item.description,
      playlistMemberships: { [item.playlistId]: item.publishedAt },
      channelTitle: item.channelTitle,
    };
  }

  size() {
    return Object.keys(this.videos).length;
  }

  *iterator() {
    for (const video of Object.values(this.videos)) {
      const { videoId, title, description, playlistMemberships, channelTitle } = video;
      yield new Video(videoId, title, description, playlistMemberships, channelTitle);
    }
  }
}

class Video {
  constructor(
    public videoId: string,
    public title?: string,
    public description?: string,
    public playlistMemberships: { [K in string]: string | undefined } = {},
    public channelTitle?: string,
  ) {}

  playlistIds(): string[] {
    return Object.keys(this.playlistMemberships);
  }
}

export { VideoCollection, Video };

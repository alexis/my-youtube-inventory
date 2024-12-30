import PlaylistItem from './playlist-item.js';
import Video from './video.js';

type VideoAttrs = {
  videoId: string;
  title: string | undefined;
  description: string | undefined;
  playlistMemberships: { [index: string]: string | undefined };
};

class VideoCollection {
  constructor(public videos: { [index: string]: VideoAttrs } = {}) {}

  addItem(item: PlaylistItem) {
    if (!this.videos[item.videoId]) {
      this.videos[item.videoId] = this.videoAttrs(item);
    } else {
      this.videos[item.videoId].playlistMemberships[item.playlistId] = item.publishedAt;
    }
  }

  videoAttrs(item: PlaylistItem): VideoAttrs {
    return {
      videoId: item.videoId,
      title: item.title,
      description: item.description,
      playlistMemberships: { [item.playlistId]: item.publishedAt },
    };
  }

  size() {
    return Object.keys(this.videos).length;
  }

  *iterator() {
    for (const video of Object.values(this.videos)) {
      const { videoId, title, description, playlistMemberships } = video;
      yield new Video(videoId, title, description, playlistMemberships);
    }
  }
}

export default VideoCollection;

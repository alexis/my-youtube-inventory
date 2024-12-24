import Video from './video.js';

class VideoCollection {
  constructor() {
    this.videos = {};
  }

  addItem(item) {
    if (!this.videos[item.videoId]) {
      this.videos[item.videoId] = this.videoAttrs(item);
    } else {
      this.videos[item.videoId].playlistMemberships[item.playlistId] = item.publishedAt;
    }
  }

  videoAttrs(item) {
    return {
      videoId: item.videoId,
      title: item.title,
      description: item.description,
      playlistMemberships: { [item.playlistId]: item.publishedAt }
    };
  }

  size() {
    return Object.keys(this.videos).length
  }

  *iterator() {
    for (const video of Object.values(this.videos)) {
      yield new Video(video);
    }
  }
}

export default VideoCollection;

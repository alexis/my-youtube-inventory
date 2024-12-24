class PlaylistItem {
  constructor(
    { videoId, kind, title, description, playlistId, publishedAt, channelTitle, position }
  ) {
    this.videoId = videoId;
    this.kind = kind;
    this.title = title;
    this.description = description;
    this.publishedAt = publishedAt;
    this.channelTitle = channelTitle;
    this.playlistId = playlistId;
    this.position = position;
  }
}

export default PlaylistItem;

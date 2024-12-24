class Video {
  constructor({ videoId, title, description, playlistMemberships }) {
    this.videoId = videoId;
    this.title = title;
    this.description = description;
    this.playlistMemberships = playlistMemberships;
  }

  playlists() {
    return Object.keys(this.playlistMemberships);
  }
}

export default Video;

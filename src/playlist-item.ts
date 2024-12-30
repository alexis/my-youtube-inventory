class PlaylistItem {
  constructor(
    public playlistId: string,
    public videoId: string,
    public kind?: string,
    public title?: string,
    public description?: string,
    public publishedAt?: string,
    public channelTitle?: string,
    public position?: number,
  ) {}
}

export default PlaylistItem;

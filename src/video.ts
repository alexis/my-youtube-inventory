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

export default Video;

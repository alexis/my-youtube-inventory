import { describe, test, expect, vi, beforeEach } from 'vitest';
import YoutubeEventer from '../src/youtube-eventer.js';
import YoutubeAdapter, { PlaylistItem } from '../src/youtube-adapter.js';
import CategoriesRegistry from '../src/categories-registry.js';

describe('YoutubeEventer', () => {
  let youtubeMock: YoutubeAdapter;
  let eventer: YoutubeEventer;
  let categoriesRegistry: CategoriesRegistry;

  beforeEach(() => {
    vi.resetModules();
    youtubeMock = {
      fetchPlaylistItems: vi.fn(),
      fetchPlaylists: vi.fn(),
    } as unknown as YoutubeAdapter;

    categoriesRegistry = new CategoriesRegistry();
    eventer = new YoutubeEventer(youtubeMock, 1);
  });

  test('emits correct events while processing a playlist', async () => {
    const playlistId = 'test_playlist';
    const mockItems: PlaylistItem[] = [
      { playlistId, videoId: 'video1' },
      { playlistId, videoId: 'video2' },
    ];

    vi.mocked(youtubeMock.fetchPlaylistItems).mockResolvedValueOnce({
      responseStatus: 200,
      responseStatusText: 'OK',
      playlistItems: mockItems,
    });

    const emitSpy = vi.spyOn(eventer, 'emit');

    await eventer.processPlaylistItemsFor(playlistId);

    expect(emitSpy).toHaveBeenCalledWith('playlist:start', playlistId);
    expect(emitSpy).toHaveBeenCalledWith('playlist:page:start', playlistId);
    expect(emitSpy).toHaveBeenCalledWith('playlist:item', mockItems[0]);
    expect(emitSpy).toHaveBeenCalledWith('playlist:item', mockItems[1]);
    expect(emitSpy).toHaveBeenCalledWith('playlist:complete', playlistId);
  });

  test('handles pagination correctly', async () => {
    const playlistId = 'paginated_playlist';
    const mockItemsPage1: PlaylistItem[] = [{ playlistId, videoId: 'video1' }];
    const mockItemsPage2: PlaylistItem[] = [{ playlistId, videoId: 'video2' }];

    vi.mocked(youtubeMock.fetchPlaylistItems)
      .mockResolvedValueOnce({
        pageToken: 'nextPage',
        playlistItems: mockItemsPage1,
        responseStatus: 200,
        responseStatusText: 'OK',
      })
      .mockResolvedValueOnce({
        pageToken: undefined,
        playlistItems: mockItemsPage2,
        responseStatus: 200,
        responseStatusText: 'OK',
      });

    const emitSpy = vi.spyOn(eventer, 'emit');

    await eventer.processPlaylistItemsFor(playlistId);

    expect(youtubeMock.fetchPlaylistItems).toHaveBeenCalledTimes(2);
    expect(emitSpy).toHaveBeenCalledWith('playlist:item', mockItemsPage1[0]);
    expect(emitSpy).toHaveBeenCalledWith('playlist:item', mockItemsPage2[0]);
  });

  test('aborts playlist processing when signal is triggered', async () => {
    const playlistId = 'test_playlist';
    const mockItems: PlaylistItem[] = [{ playlistId, videoId: 'video1' }];
    const abortController = new AbortController();

    vi.mocked(youtubeMock.fetchPlaylistItems).mockResolvedValueOnce({
      playlistItems: mockItems,
      responseStatus: 200,
      responseStatusText: 'OK',
    });

    const emitSpy = vi.spyOn(eventer, 'emit');

    abortController.abort(); // Trigger the abort before processing starts

    await eventer.processPlaylistItemsFor(playlistId, abortController.signal);

    expect(emitSpy).toHaveBeenCalledWith('playlist:abort', playlistId);
    expect(youtubeMock.fetchPlaylistItems).not.toHaveBeenCalled();
  });

  test('processes multiple playlists from categories', async () => {
    vi.mocked(youtubeMock.fetchPlaylists).mockResolvedValueOnce({
      responseStatus: 200,
      responseStatusText: 'OK',
      playlists: [{ id: 'playlist2' }, { id: 'playlist3' }],
    });

    categoriesRegistry.addCategories([
      { id: 'playlist1', label: '', type: 'playlist', syncable: true },
      { id: 'playlist2', label: '', type: 'playlist', syncable: true },
    ]);
    expect(categoriesRegistry.syncablePlaylistIds()).toEqual(['playlist1', 'playlist2']);

    const processSpy = vi.spyOn(eventer, 'processPlaylistItemsFor').mockResolvedValue();

    await eventer.processPlaylistItems(categoriesRegistry);

    expect(youtubeMock.fetchPlaylists).toHaveBeenCalled();
    expect(categoriesRegistry.syncablePlaylistIds()).toEqual([
      'playlist1',
      'playlist2',
      'playlist3',
    ]);
    expect(processSpy).toHaveBeenCalledTimes(3); // Two playlists processed
  });

  test('handles empty playlists without errors', async () => {
    vi.mocked(youtubeMock.fetchPlaylists).mockResolvedValueOnce({
      responseStatus: 200,
      responseStatusText: 'OK',
      playlists: [],
    });

    const processSpy = vi.spyOn(eventer, 'processPlaylistItemsFor');

    eventer = new YoutubeEventer(youtubeMock);
    await eventer.processPlaylistItems(categoriesRegistry);

    expect(processSpy).not.toHaveBeenCalled();
  });
});

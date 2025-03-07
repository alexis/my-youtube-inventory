import { readJsonSync, existsSync } from './utils.js';
import { type Playlist } from './youtube-adapter.js';
import assert from 'assert';

interface Category {
  id: string;
  label: string;
  type: string;
  syncable: boolean;
}

type Registry = {
  [K in string]: Category & { id: K };
};

class CategoriesRegistry {
  private registry: Registry = {};

  addCategories(categories: Category[]): void {
    const mergeable = Object.fromEntries(categories.map((c: Category) => [c.id, c]));
    assert(isRegistry(mergeable));

    this.registry = { ...this.registry, ...mergeable };
  }

  addCategoriesFromFile(file: string): void {
    if (!existsSync(file)) return;

    const categories = readJsonSync(file);
    this.addCategories(categories);
  }

  tryAddCategoriesFromFile(file: string): void {
    if (!existsSync(file)) return;
    this.addCategoriesFromFile(file);
  }

  addPlaylistsAsNewCategories(playlists: Playlist[]): void {
    for (const playlist of playlists) {
      if (this.registry[playlist.id]) continue;

      this.registry[playlist.id] = {
        id: playlist.id,
        label: playlist.title || playlist.id,
        type: 'playlist',
        syncable: true,
      };
    }
  }

  getById(id: string): Category | undefined {
    return this.registry[id];
  }

  syncablePlaylistIds(): string[] {
    return Object.values(this.registry)
      .filter(category => category.type === 'playlist' && category.syncable)
      .map(category => category.id);
  }

  toJSON(): Category[] {
    return Object.values(this.registry);
  }
}

function isCategory(category: unknown): category is Category {
  if (typeof category !== 'object' || category === null) return false;

  const keys: Array<keyof Category> = ['id', 'label', 'type', 'syncable'];
  return keys.every(property => property in category);
}

function isRegistry(registry: unknown): registry is Registry {
  if (typeof registry !== 'object' || registry === null) return false;

  return Object.entries(registry).every(([key, category]) => {
    return isCategory(category) && key === category.id;
  });
}

export default CategoriesRegistry;

(function () {
    class BookmarkStore {
        constructor(storageKey = 'quickBookmarks') {
            this.storageKey = storageKey;
            this.bookmarks = [];
            this.nextId = 1;
        }

        async load() {
            try {
                const result = await window.qaBrowser.storageGet([this.storageKey]);
                this.bookmarks = result[this.storageKey] || [];
                if (this.bookmarks.length > 0) {
                    this.nextId = Math.max(...this.bookmarks.map(b => b.id)) + 1;
                }
            } catch (error) {
                console.error('Ошибка загрузки закладок:', error);
                this.bookmarks = [];
            }
        }

        async save() {
            return window.qaBrowser.storageSet({ [this.storageKey]: this.bookmarks });
        }

        getAll() {
            return this.bookmarks;
        }

        hasPath(path) {
            return this.bookmarks.some(b => b.path === path);
        }

        createBookmark({ name, path, created }) {
            return {
                id: this.nextId++,
                name,
                path,
                created: created || new Date().toISOString()
            };
        }

        add(bookmark) {
            this.bookmarks.push(bookmark);
        }

        remove(id) {
            this.bookmarks = this.bookmarks.filter(b => b.id !== id);
        }

        updateName(id, newName) {
            const bookmark = this.bookmarks.find(b => b.id === id);
            if (bookmark) {
                bookmark.name = newName;
                return true;
            }
            return false;
        }

        reorder(fromIndex, toIndex) {
            if (fromIndex === toIndex) return;
            const item = this.bookmarks[fromIndex];
            if (!item) return;
            this.bookmarks.splice(fromIndex, 1);
            this.bookmarks.splice(toIndex, 0, item);
        }
    }

    window.BookmarkStore = BookmarkStore;
})();

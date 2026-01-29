(function () {
    class BookmarkModalController {
        constructor({ store, messageService, onUpdated }) {
            this.store = store;
            this.messageService = messageService;
            this.onUpdated = onUpdated;
        }

        open() {
            const modal = document.getElementById('addModal');
            if (!modal) return;
            modal.classList.add('show');
            setTimeout(() => {
                document.getElementById('newBookmarkName')?.focus();
            }, 100);
        }

        close() {
            const modal = document.getElementById('addModal');
            if (!modal) return;
            modal.classList.remove('show');
            const nameInput = document.getElementById('newBookmarkName');
            const pathInput = document.getElementById('newBookmarkPath');
            if (nameInput) nameInput.value = '';
            if (pathInput) pathInput.value = '';
        }

        async addFromModal() {
            const nameInput = document.getElementById('newBookmarkName');
            const pathInput = document.getElementById('newBookmarkPath');
            if (!nameInput || !pathInput) return;

            const name = nameInput.value.trim();
            const path = pathInput.value.trim();

            if (!name || !path) {
                this.messageService?.show('Заполните все поля', 'error');
                return;
            }

            if (!path.startsWith('/')) {
                this.messageService?.show('Путь должен начинаться с /', 'error');
                return;
            }

            if (this.store.hasPath(path)) {
                this.messageService?.show('Закладка с таким путём уже существует', 'error');
                return;
            }

            const bookmark = this.store.createBookmark({ name, path });
            this.store.add(bookmark);
            await this.store.save();
            this.close();
            await this.onUpdated?.();
            this.messageService?.show('Закладка добавлена', 'success');
        }
    }

    window.BookmarkModalController = BookmarkModalController;
})();

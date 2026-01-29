(function () {
    class BookmarkListView {
        constructor({ containerId, messageService, onOpen, onRemove, onEditName, onReorder }) {
            this.containerId = containerId;
            this.messageService = messageService;
            this.onOpen = onOpen;
            this.onRemove = onRemove;
            this.onEditName = onEditName;
            this.onReorder = onReorder;
            this.bookmarks = [];
            this.editingBookmarkId = null;
            this.draggedElement = null;
            this.draggedIndex = -1;
        }

        render(bookmarks) {
            this.bookmarks = bookmarks;
            const container = document.getElementById(this.containerId);
            if (!container) return;

            if (!this.bookmarks.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <div class="empty-state-title">Нет закладок</div>
                        <div class="empty-state-description">
                            Добавьте первую закладку, используя кнопки выше
                        </div>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.bookmarks.map((bookmark) => `
                <div class="bookmark-item" 
                     data-bookmark-id="${bookmark.id}"
                     draggable="true">
                    <div class="drag-handle">⋮⋮</div>
                    <div class="bookmark-content">
                        <div class="bookmark-name">${this.escapeHtml(bookmark.name)}</div>
                        <div class="bookmark-path">${this.escapeHtml(bookmark.path)}</div>
                    </div>
                    <div class="bookmark-actions">
                        <button class="btn-edit" title="Редактировать название">✎</button>
                        <button class="btn-delete" title="Удалить">×</button>
                    </div>
                </div>
            `).join('');

            this.bookmarks.forEach((bookmark, index) => {
                const element = container.querySelector(`[data-bookmark-id="${bookmark.id}"]`);
                if (!element) return;

                element.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
                element.addEventListener('dragover', (e) => this.handleDragOver(e, index));
                element.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                element.addEventListener('drop', (e) => this.handleDrop(e, index));
                element.addEventListener('dragend', () => this.handleDragEnd());

                element.querySelector('.bookmark-content').addEventListener('click', () => {
                    if (this.editingBookmarkId !== bookmark.id) {
                        this.onOpen?.(bookmark.path);
                    }
                });

                element.querySelector('.btn-edit').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.startEditBookmark(bookmark.id, bookmark.name);
                });

                element.querySelector('.btn-delete').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Удалить закладку?')) {
                        await this.onRemove?.(bookmark.id);
                    }
                });
            });
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        startEditBookmark(id, currentName) {
            const nameElement = document.querySelector(`[data-bookmark-id="${id}"] .bookmark-name`);
            if (!nameElement) return;

            this.editingBookmarkId = id;

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'bookmark-name-edit';
            input.value = currentName;
            input.maxLength = 100;

            nameElement.style.display = 'none';
            nameElement.parentNode.insertBefore(input, nameElement.nextSibling);

            input.focus();
            input.select();

            input.addEventListener('blur', () => {
                this.finishEditBookmark(id, input.value.trim());
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.finishEditBookmark(id, input.value.trim());
                } else if (e.key === 'Escape') {
                    this.cancelEditBookmark();
                }
            });
        }

        async finishEditBookmark(id, newName) {
            if (!newName || newName === '') {
                this.cancelEditBookmark();
                this.messageService?.show('Название не может быть пустым', 'error');
                return;
            }

            await this.onEditName?.(id, newName);
            this.editingBookmarkId = null;
        }

        cancelEditBookmark() {
            this.editingBookmarkId = null;
            this.render(this.bookmarks);
        }

        handleDragStart(e, index) {
            this.draggedElement = e.target.closest('.bookmark-item');
            this.draggedIndex = index;
            if (!this.draggedElement) return;
            this.draggedElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.draggedElement.innerHTML);
        }

        handleDragOver(e, index) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const targetElement = e.target.closest('.bookmark-item');
            if (targetElement && targetElement !== this.draggedElement) {
                const rect = targetElement.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                if (e.clientY < midY) {
                    targetElement.classList.add('drag-over-top');
                    targetElement.classList.remove('drag-over-bottom');
                } else {
                    targetElement.classList.add('drag-over-bottom');
                    targetElement.classList.remove('drag-over-top');
                }
            }
        }

        handleDragLeave(e) {
            const targetElement = e.target.closest('.bookmark-item');
            if (targetElement) {
                targetElement.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        }

        async handleDrop(e, targetIndex) {
            e.preventDefault();

            const targetElement = e.target.closest('.bookmark-item');
            if (!targetElement || this.draggedIndex === -1) {
                this.clearDragStyles();
                return;
            }

            const rect = targetElement.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const insertIndex = e.clientY < midY ? targetIndex : targetIndex + 1;
            const newIndex = this.draggedIndex < insertIndex ? insertIndex - 1 : insertIndex;

            if (this.draggedIndex === newIndex) {
                this.clearDragStyles();
                return;
            }

            await this.onReorder?.(this.draggedIndex, newIndex);
            this.clearDragStyles();
        }

        handleDragEnd() {
            this.clearDragStyles();
        }

        clearDragStyles() {
            const items = document.querySelectorAll('.bookmark-item');
            items.forEach(item => {
                item.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
            });
            this.draggedElement = null;
            this.draggedIndex = -1;
        }
    }

    window.BookmarkListView = BookmarkListView;
})();

(function () {
    class ImportExportController {
        constructor({ store, messageService, getCurrentSite, onUpdated }) {
            this.store = store;
            this.messageService = messageService;
            this.getCurrentSite = getCurrentSite;
            this.onUpdated = onUpdated;
        }

        openModal() {
            const modal = document.getElementById('importExportModal');
            if (!modal) return;
            modal.classList.add('show');
            this.updateLabels();
        }

        closeModal() {
            const modal = document.getElementById('importExportModal');
            if (!modal) return;
            modal.classList.remove('show');
            const importFile = document.getElementById('importFile');
            if (importFile) importFile.value = '';
        }

        updateLabels() {
            const selectedType = document.querySelector('input[name="dataType"]:checked')?.value || 'bookmarks';
            const isSnippets = selectedType === 'snippets';

            document.getElementById('importExportTitle').textContent =
                isSnippets ? 'Экспорт/Импорт сниппетов' : 'Экспорт/Импорт закладок';

            document.getElementById('exportDescription').textContent =
                isSnippets ? 'Сохранить сниппеты в файл' : 'Сохранить закладки в файл';

            document.getElementById('importDescription').textContent =
                isSnippets ? 'Загрузить сниппеты из файла' : 'Загрузить закладки из файла';

            document.getElementById('importNote').textContent =
                isSnippets ? 'Импорт добавит новые сниппеты к существующим' : 'Импорт добавит новые закладки к существующим';

            document.getElementById('exportBtn').textContent =
                isSnippets ? 'Экспорт сниппетов' : 'Экспорт закладок';

            document.getElementById('importBtn').textContent =
                isSnippets ? 'Импорт сниппетов' : 'Импорт закладок';
        }

        handleExport() {
            const selectedType = document.querySelector('input[name="dataType"]:checked')?.value || 'bookmarks';

            if (selectedType === 'bookmarks') {
                this.exportBookmarks();
            } else if (selectedType === 'snippets' && window.snippetManager) {
                window.snippetManager.exportSnippets();
            } else {
                this.messageService?.show('Менеджер сниппетов не загружен', 'error');
            }
        }

        handleImport(event) {
            const selectedType = document.querySelector('input[name="dataType"]:checked')?.value || 'bookmarks';

            if (selectedType === 'bookmarks') {
                this.importBookmarks(event);
            } else if (selectedType === 'snippets' && window.snippetManager) {
                window.snippetManager.importSnippets(event);
            } else {
                this.messageService?.show('Менеджер сниппетов не загружен', 'error');
            }
        }

        exportBookmarks() {
            try {
                const bookmarks = this.store.getAll();
                if (!bookmarks.length) {
                    this.messageService?.show('Нет закладок для экспорта', 'info');
                    return;
                }

                const currentSite = this.getCurrentSite?.() || 'unknown';

                const exportData = {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    site: currentSite,
                    bookmarks: bookmarks.map(bookmark => ({
                        name: bookmark.name,
                        path: bookmark.path,
                        created: bookmark.created
                    }))
                };

                const jsonString = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quick-subpages-${currentSite}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.closeModal();
                this.messageService?.show(`Экспортировано ${bookmarks.length} закладок`, 'success');

            } catch (error) {
                console.error('Ошибка экспорта:', error);
                this.messageService?.show('Ошибка экспорта файла', 'error');
            }
        }

        async importBookmarks(event) {
            try {
                const file = event.target.files[0];
                if (!file) return;

                if (file.type !== 'application/json') {
                    this.messageService?.show('Выберите JSON файл', 'error');
                    return;
                }

                const text = await file.text();
                const importData = JSON.parse(text);

                if (!importData.bookmarks || !Array.isArray(importData.bookmarks)) {
                    this.messageService?.show('Неверный формат файла', 'error');
                    return;
                }

                let importCount = 0;
                let skipCount = 0;

                for (const importBookmark of importData.bookmarks) {
                    if (!importBookmark.name || !importBookmark.path) {
                        skipCount++;
                        continue;
                    }

                    if (this.store.hasPath(importBookmark.path)) {
                        skipCount++;
                        continue;
                    }

                    const bookmark = this.store.createBookmark({
                        name: importBookmark.name,
                        path: importBookmark.path,
                        created: importBookmark.created || new Date().toISOString()
                    });

                    this.store.add(bookmark);
                    importCount++;
                }

                if (importCount > 0) {
                    await this.store.save();
                    await this.onUpdated?.();
                }

                this.closeModal();

                if (importCount === 0) {
                    this.messageService?.show('Нет новых закладок для импорта', 'info');
                } else {
                    let message = `Импортировано ${importCount} закладок`;
                    if (skipCount > 0) {
                        message += `, пропущено ${skipCount}`;
                    }
                    this.messageService?.show(message, 'success');
                }

            } catch (error) {
                console.error('Ошибка импорта:', error);
                this.messageService?.show('Ошибка чтения файла', 'error');
            }
        }
    }

    window.ImportExportController = ImportExportController;
})();

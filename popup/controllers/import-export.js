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
            // Больше не используем переключатель типов, поэтому оставляем пустым или ставим фиксированный текст если нужно
        }

        async handleExport() {
            try {
                this.messageService?.show('Подготовка к экспорту...', 'info');

                let storageData = {};
                const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
                if (typeof browser !== 'undefined') {
                    storageData = await browserAPI.storage.local.get(null);
                } else {
                    storageData = await new Promise(resolve => browserAPI.storage.local.get(null, resolve));
                }

                // Гарантируем, что текущие актуальные настройки (window.settings) попадают в экспорт,
                // даже если они еще ни разу не сохранялись в storage
                const encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
                const settingsToExport = window.settings ? Object.assign({}, window.settings) : {};

                // Удаляем network_password
                if (settingsToExport.network_password !== undefined) {
                    delete settingsToExport.network_password;
                }
                
                storageData.extensionSettings = encode(settingsToExport);

                const currentSite = this.getCurrentSite ? this.getCurrentSite() : 'unknown';

                const exportData = {
                    version: '2.0',
                    exportDate: new Date().toISOString(),
                    site: currentSite,
                    storage: storageData
                };

                const jsonString = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quick-access-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.closeModal();
                this.messageService?.show('Все данные экспортированы', 'success');

            } catch (error) {
                console.error('Ошибка экспорта:', error);
                this.messageService?.show('Ошибка экспорта файла', 'error');
            }
        }

        async handleImport(event) {
            try {
                const file = event.target.files[0];
                if (!file) return;

                if (file.type !== 'application/json') {
                    this.messageService?.show('Выберите JSON файл', 'error');
                    return;
                }

                const text = await file.text();
                const importData = JSON.parse(text);

                if (!importData.storage && !importData.bookmarks && !importData.snippets) {
                    this.messageService?.show('Неверный формат файла', 'error');
                    return;
                }

                const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

                // Для обратной совместимости (если загружают старый бэкап закладок)
                if (importData.bookmarks && !importData.storage) {
                    let importCount = 0;
                    for (const importBookmark of importData.bookmarks) {
                        if (!importBookmark.name || !importBookmark.path) continue;
                        if (!this.store.hasPath(importBookmark.path)) {
                            const bookmark = this.store.createBookmark({
                                name: importBookmark.name,
                                path: importBookmark.path,
                                created: importBookmark.created || new Date().toISOString()
                            });
                            this.store.add(bookmark);
                            importCount++;
                        }
                    }
                    if (importCount > 0) {
                        await this.store.save();
                    }
                } 
                // Для обратной совместимости со старым форматом сниппетов (если загружают старый бэкап)
                else if (importData.snippets && !importData.storage) {
                    if (window.snippetManager) {
                        window.snippetManager.importSnippets({target:{files:[file]}});
                    } else {
                        // Если snippetManager по каким-то причинам не загружен:
                        let currentSnippetsResult;
                        if (typeof browser !== 'undefined') {
                            currentSnippetsResult = await browserAPI.storage.local.get(['codeSnippets']);
                        } else {
                            currentSnippetsResult = await new Promise(resolve => browserAPI.storage.local.get(['codeSnippets'], resolve));
                        }
                        const existingSnippets = currentSnippetsResult.codeSnippets || [];
                        let nextId = existingSnippets.length > 0 ? Math.max(...existingSnippets.map(s => s.id)) + 1 : 1;
                        
                        for (const s of importData.snippets) {
                            if (!existingSnippets.some(ex => ex.name === s.name)) {
                                existingSnippets.push({ ...s, id: nextId++ });
                            }
                        }
                        
                        if (typeof browser !== 'undefined') {
                            await browserAPI.storage.local.set({codeSnippets: existingSnippets});
                        } else {
                            await new Promise(resolve => browserAPI.storage.local.set({codeSnippets: existingSnippets}, resolve));
                        }
                    }
                }
                // Новый формат V2.0 - полное восстановление из storage
                else if (importData.storage) {
                    // Чтобы не затереть существующий пароль нетворка (если он есть в текущих настройках):
                    let currentStorage;
                    if (typeof browser !== 'undefined') {
                        currentStorage = await browserAPI.storage.local.get(['extensionSettings']);
                    } else {
                        currentStorage = await new Promise(resolve => browserAPI.storage.local.get(['extensionSettings'], resolve));
                    }

                    if (importData.storage.extensionSettings && currentStorage.extensionSettings) {
                        const decode = (str) => JSON.parse(decodeURIComponent(escape(atob(str))));
                        const encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
                        
                        try {
                            const newSettings = decode(importData.storage.extensionSettings);
                            const oldSettings = decode(currentStorage.extensionSettings);
                            
                            // Сохраняем текущий пароль
                            if (oldSettings.network_password !== undefined) {
                                newSettings.network_password = oldSettings.network_password;
                            }
                            importData.storage.extensionSettings = encode(newSettings);
                        } catch (e) {
                             console.error('Ошибка мержа настроек', e);
                        }
                    }

                    if (typeof browser !== 'undefined') {
                        await browserAPI.storage.local.set(importData.storage);
                    } else {
                        await new Promise(resolve => browserAPI.storage.local.set(importData.storage, resolve));
                    }
                }

                await this.onUpdated?.();
                this.closeModal();

                this.messageService?.show('Данные успешно импортированы. Рекомендуем перезагрузить расширение.', 'success');
                
                // Перезагрузка страницы для обновления состояния
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Ошибка импорта:', error);
                this.messageService?.show('Ошибка чтения файла', 'error');
            }
        }
    }

    window.ImportExportController = ImportExportController;
})();

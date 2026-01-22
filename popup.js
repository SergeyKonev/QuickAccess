// Обновленная версия расширения "Быстрые подстраницы" с drag and drop и редактированием

// Универсальная совместимость Chrome + Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class CompactQuickBookmarks {
    constructor() {
        this.bookmarks = [];
        this.currentSite = '';
        this.currentUrl = '';
        this.nextId = 1;
        this.messageTimeout = null;
        this.draggedElement = null;
        this.draggedIndex = -1;
        this.editingBookmarkId = null;
        this.init();
    }

    async init() {
        await this.loadCurrentSite();
        await this.loadBookmarks();
        this.bindEvents();
        this.renderBookmarks();
        this.populateTariffCoupons();
    }

    async loadCurrentSite() {
        try {
            let tabs;
            if (typeof browser !== 'undefined') {
                tabs = await browserAPI.tabs.query({active: true, currentWindow: true});
            } else {
                tabs = await new Promise((resolve) => {
                    browserAPI.tabs.query({active: true, currentWindow: true}, resolve);
                });
            }
            
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                this.currentSite = url.hostname;
                this.currentUrl = tabs[0].url;
            } else {
                this.currentSite = 'localhost';
                this.currentUrl = '';
            }
        } catch (error) {
            console.error('Ошибка получения текущего сайта:', error);
            this.currentSite = 'localhost';
            this.currentUrl = '';
        }
        
        document.getElementById('currentSite').textContent = this.currentSite;
    }

    async loadBookmarks() {
        try {
            let result;
            if (typeof browser !== 'undefined') {
                result = await browserAPI.storage.local.get(['quickBookmarks']);
            } else {
                result = await new Promise((resolve) => {
                    browserAPI.storage.local.get(['quickBookmarks'], resolve);
                });
            }
            
            this.bookmarks = result.quickBookmarks || [];
            if (this.bookmarks.length > 0) {
                this.nextId = Math.max(...this.bookmarks.map(b => b.id)) + 1;
            }
        } catch (error) {
            console.error('Ошибка загрузки закладок:', error);
            this.bookmarks = [];
        }
    }

    async saveBookmarks() {
        try {
            if (typeof browser !== 'undefined') {
                await browserAPI.storage.local.set({quickBookmarks: this.bookmarks});
            } else {
                await new Promise((resolve) => {
                    browserAPI.storage.local.set({quickBookmarks: this.bookmarks}, resolve);
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения закладок:', error);
            this.showMessage('Ошибка сохранения закладок', 'error');
        }
    }

    bindEvents() {
        // Обработчики переключения вкладок
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });

        // Существующие обработчики событий
        document.getElementById('addCurrentPage').addEventListener('click', () => {
            this.addCurrentPageAsBookmark();
        });

        document.getElementById('addBookmarkBtn').addEventListener('click', () => {
            this.openAddModal();
        });

        document.getElementById('importExportBtn').addEventListener('click', () => {
            this.openUniversalImportExportModal();
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeAddModal();
        });

        document.getElementById('cancelAdd').addEventListener('click', () => {
            this.closeAddModal();
        });

        document.getElementById('closeImportExportModal').addEventListener('click', () => {
            this.closeImportExportModal();
        });

        document.getElementById('confirmAdd').addEventListener('click', () => {
            this.addBookmarkFromModal();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.handleUniversalExport();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.handleUniversalImport(e);
        });

        // Переключение типов данных в модальном окне
        const dataTypeRadios = document.querySelectorAll('input[name="dataType"]');
        dataTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateImportExportLabels();
            });
        });

        const inputs = [
            document.getElementById('newBookmarkName'),
            document.getElementById('newBookmarkPath')
        ];

        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addBookmarkFromModal();
                }
            });
        });

        document.getElementById('newBookmarkPath').addEventListener('input', (e) => {
            let value = e.target.value;
            if (value && !value.startsWith('/')) {
                e.target.value = '/' + value;
            }
        });

        // Закрытие модальных окон по клику вне их
        document.getElementById('addModal').addEventListener('click', (e) => {
            if (e.target.id === 'addModal') {
                this.closeAddModal();
            }
        });

        document.getElementById('importExportModal').addEventListener('click', (e) => {
            if (e.target.id === 'importExportModal') {
                this.closeImportExportModal();
            }
        });

        const activateTariffBtn = document.getElementById('activateTariffBtn');
        if (activateTariffBtn) {
            activateTariffBtn.addEventListener('click', () => {
                this.activateTariffCoupon();
            });
        }
    }

    async addCurrentPageAsBookmark() {
        try {
            if (!this.currentUrl) {
                this.showMessage('Не удалось определить текущую страницу', 'error');
                return;
            }

            const url = new URL(this.currentUrl);
            const path = url.pathname + url.search + url.hash;

            let tabs;
            if (typeof browser !== 'undefined') {
                tabs = await browserAPI.tabs.query({active: true, currentWindow: true});
            } else {
                tabs = await new Promise((resolve) => {
                    browserAPI.tabs.query({active: true, currentWindow: true}, resolve);
                });
            }

            const title = tabs[0]?.title || 'Без названия';

            if (this.bookmarks.some(b => b.path === path)) {
                this.showMessage('Эта страница уже в закладках', 'error');
                return;
            }

            const bookmark = {
                id: this.nextId++,
                name: title.length > 50 ? title.substring(0, 47) + '...' : title,
                path: path,
                created: new Date().toISOString()
            };

            this.bookmarks.push(bookmark);
            await this.saveBookmarks();
            this.renderBookmarks();
            this.showMessage('Страница добавлена', 'success');

        } catch (error) {
            console.error('Ошибка добавления текущей страницы:', error);
            this.showMessage('Ошибка добавления страницы', 'error');
        }
    }

    // Новые методы для drag and drop
    handleDragStart(e, index) {
        this.draggedElement = e.target.closest('.bookmark-item');
        this.draggedIndex = index;
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
        
        if (this.draggedIndex === targetIndex) {
            this.clearDragStyles();
            return;
        }

        const targetElement = e.target.closest('.bookmark-item');
        const rect = targetElement.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertIndex = e.clientY < midY ? targetIndex : targetIndex + 1;

        // Изменяем порядок в массиве
        const draggedBookmark = this.bookmarks[this.draggedIndex];
        this.bookmarks.splice(this.draggedIndex, 1);
        
        const newIndex = this.draggedIndex < insertIndex ? insertIndex - 1 : insertIndex;
        this.bookmarks.splice(newIndex, 0, draggedBookmark);

        await this.saveBookmarks();
        this.renderBookmarks();
        this.showMessage('Порядок закладок изменен', 'success');
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

    // Методы для редактирования названий
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
                this.cancelEditBookmark(id);
            }
        });
    }

    async finishEditBookmark(id, newName) {
        if (!newName || newName === '') {
            this.cancelEditBookmark(id);
            this.showMessage('Название не может быть пустым', 'error');
            return;
        }

        const bookmark = this.bookmarks.find(b => b.id === id);
        if (bookmark) {
            bookmark.name = newName;
            await this.saveBookmarks();
            this.showMessage('Название изменено', 'success');
        }

        this.renderBookmarks();
        this.editingBookmarkId = null;
    }

    cancelEditBookmark(id) {
        this.editingBookmarkId = null;
        this.renderBookmarks();
    }

    openAddModal() {
        const modal = document.getElementById('addModal');
        modal.classList.add('show');
        setTimeout(() => {
            document.getElementById('newBookmarkName').focus();
        }, 100);
    }

    closeAddModal() {
        const modal = document.getElementById('addModal');
        modal.classList.remove('show');
        document.getElementById('newBookmarkName').value = '';
        document.getElementById('newBookmarkPath').value = '';
    }

    async addBookmarkFromModal() {
        const nameInput = document.getElementById('newBookmarkName');
        const pathInput = document.getElementById('newBookmarkPath');
        const name = nameInput.value.trim();
        const path = pathInput.value.trim();

        if (!name || !path) {
            this.showMessage('Заполните все поля', 'error');
            return;
        }

        if (!path.startsWith('/')) {
            this.showMessage('Путь должен начинаться с /', 'error');
            return;
        }

        if (this.bookmarks.some(b => b.path === path)) {
            this.showMessage('Закладка с таким путём уже существует', 'error');
            return;
        }

        const bookmark = {
            id: this.nextId++,
            name: name,
            path: path,
            created: new Date().toISOString()
        };

        this.bookmarks.push(bookmark);
        await this.saveBookmarks();
        this.closeAddModal();
        this.renderBookmarks();
        this.showMessage('Закладка добавлена', 'success');
    }

    async removeBookmark(id) {
        this.bookmarks = this.bookmarks.filter(b => b.id !== id);
        await this.saveBookmarks();
        this.renderBookmarks();
        this.showMessage('Закладка удалена', 'success');
    }

    async openBookmark(path) {
        try {
            const protocol = this.currentSite.includes('localhost') ? 'http://' : 'https://';
            const url = `${protocol}${this.currentSite}${path}`;
            
            if (typeof browser !== 'undefined') {
                await browserAPI.tabs.create({url: url});
            } else {
                browserAPI.tabs.create({url: url});
            }
            
            window.close();
        } catch (error) {
            console.error('Ошибка открытия закладки:', error);
            this.showMessage('Ошибка открытия страницы', 'error');
        }
    }

    exportBookmarks() {
        try {
            if (this.bookmarks.length === 0) {
                this.showMessage('Нет закладок для экспорта', 'info');
                return;
            }

            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                site: this.currentSite,
                bookmarks: this.bookmarks.map(bookmark => ({
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
            a.download = `quick-subpages-${this.currentSite}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.closeImportExportModal();
            this.showMessage(`Экспортировано ${this.bookmarks.length} закладок`, 'success');

        } catch (error) {
            console.error('Ошибка экспорта:', error);
            this.showMessage('Ошибка экспорта файла', 'error');
        }
    }

    async importBookmarks(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            if (file.type !== 'application/json') {
                this.showMessage('Выберите JSON файл', 'error');
                return;
            }

            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.bookmarks || !Array.isArray(importData.bookmarks)) {
                this.showMessage('Неверный формат файла', 'error');
                return;
            }

            let importCount = 0;
            let skipCount = 0;

            for (const importBookmark of importData.bookmarks) {
                if (!importBookmark.name || !importBookmark.path) {
                    skipCount++;
                    continue;
                }

                if (this.bookmarks.some(b => b.path === importBookmark.path)) {
                    skipCount++;
                    continue;
                }

                const bookmark = {
                    id: this.nextId++,
                    name: importBookmark.name,
                    path: importBookmark.path,
                    created: importBookmark.created || new Date().toISOString()
                };

                this.bookmarks.push(bookmark);
                importCount++;
            }

            if (importCount > 0) {
                await this.saveBookmarks();
                this.renderBookmarks();
            }

            this.closeImportExportModal();

            if (importCount === 0) {
                this.showMessage('Нет новых закладок для импорта', 'info');
            } else {
                let message = `Импортировано ${importCount} закладок`;
                if (skipCount > 0) {
                    message += `, пропущено ${skipCount}`;
                }
                this.showMessage(message, 'success');
            }

        } catch (error) {
            console.error('Ошибка импорта:', error);
            this.showMessage('Ошибка чтения файла', 'error');
        }
    }

    renderBookmarks() {
        const container = document.getElementById('bookmarksList');
        
        if (this.bookmarks.length === 0) {
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

        container.innerHTML = this.bookmarks.map((bookmark, index) => `
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

        // Привязываем события для каждой закладки
        this.bookmarks.forEach((bookmark, index) => {
            const element = container.querySelector(`[data-bookmark-id="${bookmark.id}"]`);
            
            // Drag and drop события
            element.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
            element.addEventListener('dragover', (e) => this.handleDragOver(e, index));
            element.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            element.addEventListener('drop', (e) => this.handleDrop(e, index));
            element.addEventListener('dragend', () => this.handleDragEnd());

            // Клик по закладке
            element.querySelector('.bookmark-content').addEventListener('click', () => {
                if (this.editingBookmarkId !== bookmark.id) {
                    this.openBookmark(bookmark.path);
                }
            });

            // Кнопка редактирования
            element.querySelector('.btn-edit').addEventListener('click', (e) => {
                e.stopPropagation();
                this.startEditBookmark(bookmark.id, bookmark.name);
            });

            // Кнопка удаления
            element.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Удалить закладку?')) {
                    this.removeBookmark(bookmark.id);
                }
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(text, type = 'info') {
        const message = document.getElementById('message');
        message.textContent = text;
        message.className = `message ${type}`;
        message.classList.add('show');

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        this.messageTimeout = setTimeout(() => {
            message.classList.remove('show');
        }, 3000);
    }

    populateTariffCoupons() {
        const selectElement = document.getElementById('tariffCouponSelect');
        if (!selectElement) return;

        const coupons = settings?.license_coupons || [];
        selectElement.innerHTML = '';

        if (!coupons.length) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Купоны не настроены';
            option.disabled = true;
            option.selected = true;
            selectElement.appendChild(option);
            return;
        }

        coupons.forEach(coupon => {
            if (!coupon?.value || !coupon?.name) return;
            const option = document.createElement('option');
            option.value = coupon.value;
            option.textContent = coupon.name;
            selectElement.appendChild(option);
        });
    }

    async activateTariffCoupon() {
        const selectElement = document.getElementById('tariffCouponSelect');
        if (!selectElement) return;

        const coupon = selectElement.value;
        if (!coupon) {
            this.showMessage('Выберите тариф', 'error');
            return;
        }

        try {
            let tabs;
            if (typeof browser !== 'undefined') {
                tabs = await browserAPI.tabs.query({active: true, currentWindow: true});
            } else {
                tabs = await new Promise((resolve) => {
                    browserAPI.tabs.query({active: true, currentWindow: true}, resolve);
                });
            }

            const tabId = tabs?.[0]?.id;
            if (!tabId) {
                this.showMessage('Активная вкладка не найдена', 'error');
                return;
            }

            if (!browserAPI.scripting?.executeScript) {
                this.showMessage('API scripting недоступен', 'error');
                return;
            }

            const results = await browserAPI.scripting.executeScript({
                target: { tabId },
                world: 'MAIN',
                args: [coupon],
                func: (couponValue) => {
                    try {
                        if (!window.BX?.ajax?.runAction) {
                            return { ok: false, error: 'BX.ajax.runAction недоступен' };
                        }
                        window.BX.ajax.runAction('bitrix24.v2.License.Coupon.activate', {
                            data: { coupon: couponValue }
                        });
                        return { ok: true };
                    } catch (error) {
                        return { ok: false, error: error?.message || 'Ошибка выполнения' };
                    }
                }
            });

            const result = results?.[0]?.result;
            if (result?.ok) {
                this.showMessage('Команда активации отправлена. Перезагрузите вкладку через Ctrl+F5', 'success');
            } else {
                this.showMessage(result?.error || 'Не удалось выполнить активацию', 'error');
            }
        } catch (error) {
            console.error('Ошибка активации тарифа:', error);
            this.showMessage('Ошибка выполнения в активной вкладке', 'error');
        }
    }

    switchTab(tabName) {
        // Удаляем активный класс со всех кнопок вкладок
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Скрываем все контенты вкладок
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        // Активируем выбранную вкладку
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);

        if (activeButton) {
            activeButton.classList.add('active');
        }

        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    openUniversalImportExportModal() {
        const modal = document.getElementById('importExportModal');
        modal.classList.add('show');
        this.updateImportExportLabels();
    }

    closeImportExportModal() {
        const modal = document.getElementById('importExportModal');
        modal.classList.remove('show');
        document.getElementById('importFile').value = '';
    }

    updateImportExportLabels() {
        const selectedType = document.querySelector('input[name="dataType"]:checked')?.value || 'bookmarks';
        const isSnippets = selectedType === 'snippets';
        
        // Обновляем заголовки и описания
        document.getElementById('importExportTitle').textContent = 
            isSnippets ? 'Экспорт/Импорт сниппетов' : 'Экспорт/Импорт закладок';
        
        document.getElementById('exportDescription').textContent = 
            isSnippets ? 'Сохранить сниппеты в файл' : 'Сохранить закладки в файл';
        
        document.getElementById('importDescription').textContent = 
            isSnippets ? 'Загрузить сниппеты из файла' : 'Загрузить закладки из файла';
        
        document.getElementById('importNote').textContent = 
            isSnippets ? 'Импорт добавит новые сниппеты к существующим' : 'Импорт добавит новые закладки к существующим';
        
        // Обновляем текст кнопок
        document.getElementById('exportBtn').textContent = 
            isSnippets ? 'Экспорт сниппетов' : 'Экспорт закладок';
        
        document.getElementById('importBtn').textContent = 
            isSnippets ? 'Импорт сниппетов' : 'Импорт закладок';
    }

    handleUniversalExport() {
        const selectedType = document.querySelector('input[name="dataType"]:checked')?.value || 'bookmarks';
        
        if (selectedType === 'bookmarks') {
            this.exportBookmarks();
        } else if (selectedType === 'snippets' && window.snippetManager) {
            window.snippetManager.exportSnippets();
        } else {
            this.showMessage('Менеджер сниппетов не загружен', 'error');
        }
    }

    handleUniversalImport(event) {
        const selectedType = document.querySelector('input[name="dataType"]:checked')?.value || 'bookmarks';
        
        if (selectedType === 'bookmarks') {
            this.importBookmarks(event);
        } else if (selectedType === 'snippets' && window.snippetManager) {
            window.snippetManager.importSnippets(event);
        } else {
            this.showMessage('Менеджер сниппетов не загружен', 'error');
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new CompactQuickBookmarks();
});
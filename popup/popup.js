// Упрощенный контроллер popup, декомпозированный на сервисы
class QuickAccessPopup {
    constructor() {
        this.currentSite = '';
        this.currentUrl = '';
        this.currentProtocol = 'https:';
        this.currentTabIndex = 0;

        this.messageService = new MessageService();
        this.bookmarkStore = new BookmarkStore();
        this.bookmarkListView = new BookmarkListView({
            containerId: 'bookmarksList',
            messageService: this.messageService,
            onOpen: (path) => this.openBookmark(path),
            onRemove: (id) => this.removeBookmark(id),
            onEditName: (id, name) => this.updateBookmarkName(id, name),
            onReorder: (fromIndex, toIndex) => this.reorderBookmarks(fromIndex, toIndex)
        });
        this.bookmarkModal = new BookmarkModalController({
            store: this.bookmarkStore,
            messageService: this.messageService,
            onUpdated: () => this.renderBookmarks()
        });
        this.importExportController = new ImportExportController({
            store: this.bookmarkStore,
            messageService: this.messageService,
            getCurrentSite: () => this.currentSite,
            onUpdated: () => this.renderBookmarks()
        });
        this.tariffController = new TariffController({
            messageService: this.messageService
        });

        this.init();
    }

    async init() {
        await this.loadCurrentSite();
        await this.bookmarkStore.load();
        this.bindEvents();
        this.renderBookmarks();
        this.tariffController.populateTariffCoupons();
    }

    async loadCurrentSite() {
        try {
            const tabs = await window.qaBrowser.queryActiveTab();
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                this.currentSite = url.hostname;
                this.currentUrl = tabs[0].url;
                this.currentProtocol = url.protocol;
                this.currentTabIndex = tabs[0].index;
            } else {
                this.currentSite = 'localhost';
                this.currentUrl = '';
                this.currentProtocol = 'https:';
                this.currentTabIndex = 0;
            }
        } catch (error) {
            console.error('Ошибка получения текущего сайта:', error);
            this.currentSite = 'localhost';
            this.currentUrl = '';
            this.currentProtocol = 'https:';
            this.currentTabIndex = 0;
        }

        const currentSiteEl = document.getElementById('currentSite');
        if (currentSiteEl) {
            currentSiteEl.textContent = this.currentSite;
        }
    }

    bindEvents() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });

        document.getElementById('addCurrentPage')?.addEventListener('click', () => {
            this.addCurrentPageAsBookmark();
        });

        document.getElementById('addBookmarkBtn')?.addEventListener('click', () => {
            this.bookmarkModal.open();
        });

        document.getElementById('importExportBtn')?.addEventListener('click', () => {
            this.importExportController.openModal();
        });

        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.bookmarkModal.close();
        });

        document.getElementById('cancelAdd')?.addEventListener('click', () => {
            this.bookmarkModal.close();
        });

        document.getElementById('closeImportExportModal')?.addEventListener('click', () => {
            this.importExportController.closeModal();
        });

        document.getElementById('confirmAdd')?.addEventListener('click', () => {
            this.bookmarkModal.addFromModal();
        });

        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.importExportController.handleExport();
        });

        document.getElementById('importBtn')?.addEventListener('click', () => {
            document.getElementById('importFile')?.click();
        });

        document.getElementById('importFile')?.addEventListener('change', (e) => {
            this.importExportController.handleImport(e);
        });

        const dataTypeRadios = document.querySelectorAll('input[name="dataType"]');
        dataTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.importExportController.updateLabels();
            });
        });

        const inputs = [
            document.getElementById('newBookmarkName'),
            document.getElementById('newBookmarkPath')
        ];

        inputs.forEach(input => {
            input?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.bookmarkModal.addFromModal();
                }
            });
        });

        document.getElementById('newBookmarkPath')?.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value && !value.startsWith('/')) {
                e.target.value = '/' + value;
            }
        });

        document.getElementById('addModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'addModal') {
                this.bookmarkModal.close();
            }
        });

        document.getElementById('importExportModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'importExportModal') {
                this.importExportController.closeModal();
            }
        });

        document.getElementById('activateTariffBtn')?.addEventListener('click', () => {
            this.tariffController.activateTariffCoupon();
        });
    }

    async addCurrentPageAsBookmark() {
        try {
            if (!this.currentUrl) {
                this.messageService.show('Не удалось определить текущую страницу', 'error');
                return;
            }

            const url = new URL(this.currentUrl);
            const path = url.pathname + url.search + url.hash;

            const tabs = await window.qaBrowser.queryActiveTab();
            const title = tabs[0]?.title || 'Без названия';

            if (this.bookmarkStore.hasPath(path)) {
                this.messageService.show('Эта страница уже в закладках', 'error');
                return;
            }

            const bookmark = this.bookmarkStore.createBookmark({
                name: title.length > 50 ? title.substring(0, 47) + '...' : title,
                path
            });

            this.bookmarkStore.add(bookmark);
            await this.bookmarkStore.save();
            this.renderBookmarks();
            this.messageService.show('Страница добавлена', 'success');

        } catch (error) {
            console.error('Ошибка добавления текущей страницы:', error);
            this.messageService.show('Ошибка добавления страницы', 'error');
        }
    }

    async removeBookmark(id) {
        this.bookmarkStore.remove(id);
        await this.bookmarkStore.save();
        this.renderBookmarks();
        this.messageService.show('Закладка удалена', 'success');
    }

    async updateBookmarkName(id, newName) {
        if (this.bookmarkStore.updateName(id, newName)) {
            await this.bookmarkStore.save();
            this.messageService.show('Название изменено', 'success');
        }
        this.renderBookmarks();
    }

    async reorderBookmarks(fromIndex, toIndex) {
        this.bookmarkStore.reorder(fromIndex, toIndex);
        await this.bookmarkStore.save();
        this.renderBookmarks();
        this.messageService.show('Порядок закладок изменен', 'success');
    }

    async openBookmark(path) {
        try {
            const url = `${this.currentProtocol}//${this.currentSite}${path}`;
            const createOptions = {
                url,
                index: this.currentTabIndex + 1,
                active: false
            };

            if (typeof browser !== 'undefined') {
                await window.qaBrowser.browserAPI.tabs.create(createOptions);
            } else {
                window.qaBrowser.browserAPI.tabs.create(createOptions);
            }
        } catch (error) {
            console.error('Ошибка открытия закладки:', error);
            this.messageService.show('Ошибка открытия страницы', 'error');
        }
    }

    renderBookmarks() {
        this.bookmarkListView.render(this.bookmarkStore.getAll());
    }

    switchTab(tabName) {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);

        if (activeButton) {
            activeButton.classList.add('active');
        }

        if (activeContent) {
            activeContent.classList.add('active');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuickAccessPopup();
});
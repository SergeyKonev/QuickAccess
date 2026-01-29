// Класс для управления сниппетами кода
class SnippetManager {
    constructor() {
        this.snippets = [];
        this.currentSite = '';
        this.nextId = 1;
        this.editingSnippetId = null;
        this.messageTimeout = null;
        this.browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        
        // Проверяем доступность settings при инициализации
        if (typeof settings === 'undefined') {
            console.warn('Settings не загружены при инициализации SnippetManager');
        }
        
        this.init();
    }

    async init() {
        await this.loadCurrentSite();
        await this.loadSnippets();
        this.bindEvents();
        this.renderSnippets();
    }

    async loadCurrentSite() {
        try {
            let tabs;
            if (typeof browser !== 'undefined') {
                tabs = await this.browserAPI.tabs.query({active: true, currentWindow: true});
            } else {
                tabs = await new Promise((resolve) => {
                    this.browserAPI.tabs.query({active: true, currentWindow: true}, resolve);
                });
            }
            
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                this.currentSite = url.hostname;
            } else {
                this.currentSite = 'localhost';
            }
        } catch (error) {
            console.error('Ошибка получения текущего сайта:', error);
            this.currentSite = 'localhost';
        }
        
        const currentSiteElement = document.getElementById('currentSiteSnippets');
        if (currentSiteElement) {
            currentSiteElement.textContent = this.currentSite;
        }
    }

    async loadSnippets() {
        try {
            let result;
            if (typeof browser !== 'undefined') {
                result = await this.browserAPI.storage.local.get(['codeSnippets']);
            } else {
                result = await new Promise((resolve) => {
                    this.browserAPI.storage.local.get(['codeSnippets'], resolve);
                });
            }
            
            this.snippets = result.codeSnippets || [];
            if (this.snippets.length > 0) {
                this.nextId = Math.max(...this.snippets.map(s => s.id)) + 1;
            }
        } catch (error) {
            console.error('Ошибка загрузки сниппетов:', error);
            this.snippets = [];
        }
    }

    async saveSnippets() {
        try {
            if (typeof browser !== 'undefined') {
                await this.browserAPI.storage.local.set({codeSnippets: this.snippets});
            } else {
                await new Promise((resolve) => {
                    this.browserAPI.storage.local.set({codeSnippets: this.snippets}, resolve);
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения сниппетов:', error);
            this.showMessage('Ошибка сохранения сниппетов', 'error');
        }
    }

    bindEvents() {
        // Кнопка добавления сниппета
        const addSnippetBtn = document.getElementById('addSnippetBtn');
        if (addSnippetBtn) {
            addSnippetBtn.addEventListener('click', () => {
                this.openAddSnippetModal();
            });
        }

        // Модальное окно сниппета
        const closeSnippetModal = document.getElementById('closeSnippetModal');
        if (closeSnippetModal) {
            closeSnippetModal.addEventListener('click', () => {
                this.closeSnippetModal();
            });
        }

        const cancelSnippet = document.getElementById('cancelSnippet');
        if (cancelSnippet) {
            cancelSnippet.addEventListener('click', () => {
                this.closeSnippetModal();
            });
        }

        const confirmSnippet = document.getElementById('confirmSnippet');
        if (confirmSnippet) {
            confirmSnippet.addEventListener('click', () => {
                this.saveSnippetFromModal();
            });
        }

        // Закрытие модальных окон по клику вне их
        const addSnippetModal = document.getElementById('addSnippetModal');
        if (addSnippetModal) {
            addSnippetModal.addEventListener('click', (e) => {
                if (e.target.id === 'addSnippetModal') {
                    this.closeSnippetModal();
                }
            });
        }

        // Поддержка Enter в полях ввода
        const snippetName = document.getElementById('snippetName');
        if (snippetName) {
            snippetName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    this.saveSnippetFromModal();
                }
            });
        }

        const snippetCode = document.getElementById('snippetCode');
        if (snippetCode) {
            snippetCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.saveSnippetFromModal();
                }
            });
        }
    }

    openAddSnippetModal(snippet = null) {
        const modal = document.getElementById('addSnippetModal');
        const title = document.getElementById('snippetModalTitle');
        const nameInput = document.getElementById('snippetName');
        const codeInput = document.getElementById('snippetCode');
        
        if (snippet) {
            // Редактирование
            this.editingSnippetId = snippet.id;
            title.textContent = 'Редактировать сниппет';
            nameInput.value = snippet.name;
            codeInput.value = snippet.code;
        } else {
            // Создание нового
            this.editingSnippetId = null;
            title.textContent = 'Новый сниппет';
            nameInput.value = '';
            codeInput.value = '<?php\n// Ваш PHP код здесь\necho "Hello World";';
        }
        
        modal.classList.add('show');
        setTimeout(() => {
            nameInput.focus();
        }, 100);
    }

    closeSnippetModal() {
        const modal = document.getElementById('addSnippetModal');
        modal.classList.remove('show');
        this.editingSnippetId = null;
    }

    async saveSnippetFromModal() {
        const nameInput = document.getElementById('snippetName');
        const codeInput = document.getElementById('snippetCode');
        const name = nameInput.value.trim();
        const code = codeInput.value.trim();

        if (!name) {
            this.showMessage('Введите название сниппета', 'error');
            nameInput.focus();
            return;
        }

        if (!code) {
            this.showMessage('Введите код сниппета', 'error');
            codeInput.focus();
            return;
        }

        if (this.editingSnippetId) {
            // Редактирование существующего сниппета
            const snippet = this.snippets.find(s => s.id === this.editingSnippetId);
            if (snippet) {
                snippet.name = name;
                snippet.code = code;
                snippet.updated = new Date().toISOString();
                this.showMessage('Сниппет обновлен', 'success');
            }
        } else {
            // Создание нового сниппета
            if (this.snippets.some(s => s.name === name)) {
                this.showMessage('Сниппет с таким названием уже существует', 'error');
                return;
            }

            const snippet = {
                id: this.nextId++,
                name: name,
                code: code,
                created: new Date().toISOString()
            };

            this.snippets.push(snippet);
            this.showMessage('Сниппет добавлен', 'success');
        }

        await this.saveSnippets();
        this.closeSnippetModal();
        this.renderSnippets();
    }

    async removeSnippet(id) {
        this.snippets = this.snippets.filter(s => s.id !== id);
        await this.saveSnippets();
        this.renderSnippets();
        this.showMessage('Сниппет удален', 'success');
    }

    async executeSnippet(snippet) {
        try {
            // Проверяем доступность settings
            if (typeof settings === 'undefined') {
                this.showMessage('Настройки (settings.js) не загружены', 'error');
                console.error('Settings не загружены для выполнения сниппета');
                return;
            }

            // Получаем путь из настроек
            const executionPath = settings?.php_execution_path || '/admin/debug.php';
            
            if (!executionPath) {
                this.showMessage('Путь выполнения не настроен в settings.js', 'error');
                console.error('php_execution_path не настроен в settings');
                return;
            }
            
            // Кодируем PHP код для передачи в URL
            const encodedCode = encodeURIComponent(snippet.code);
            
            // Формируем URL для выполнения
            const protocol = this.currentSite.includes('localhost') ? 'http://' : 'https://';
            const executionUrl = `${protocol}${this.currentSite}${executionPath}?PHPCode=y&CODE=${encodedCode}`;
            
            console.log('Выполнение сниппета:', snippet.name);
            console.log('URL выполнения:', executionUrl);
            
            // Открываем новую вкладку с выполнением кода
            if (typeof browser !== 'undefined') {
                await this.browserAPI.tabs.create({url: executionUrl});
            } else {
                this.browserAPI.tabs.create({url: executionUrl});
            }
            
            // Закрываем popup
            window.close();
            
        } catch (error) {
            console.error('Ошибка выполнения сниппета:', error);
            this.showMessage('Ошибка выполнения кода: ' + error.message, 'error');
        }
    }

    exportSnippets() {
        try {
            if (this.snippets.length === 0) {
                this.showMessage('Нет сниппетов для экспорта', 'info');
                return;
            }

            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                snippets: this.snippets.map(snippet => ({
                    name: snippet.name,
                    code: snippet.code,
                    created: snippet.created,
                    updated: snippet.updated
                }))
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `code-snippets-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Закрываем универсальное модальное окно
            const modal = document.getElementById('importExportModal');
            if (modal) {
                modal.classList.remove('show');
            }
            this.showMessage(`Экспортировано ${this.snippets.length} сниппетов`, 'success');

        } catch (error) {
            console.error('Ошибка экспорта:', error);
            this.showMessage('Ошибка экспорта файла', 'error');
        }
    }

    async importSnippets(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            if (file.type !== 'application/json') {
                this.showMessage('Выберите JSON файл', 'error');
                return;
            }

            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.snippets || !Array.isArray(importData.snippets)) {
                this.showMessage('Неверный формат файла', 'error');
                return;
            }

            let importCount = 0;
            let skipCount = 0;

            for (const importSnippet of importData.snippets) {
                if (!importSnippet.name || !importSnippet.code) {
                    skipCount++;
                    continue;
                }

                if (this.snippets.some(s => s.name === importSnippet.name)) {
                    skipCount++;
                    continue;
                }

                const snippet = {
                    id: this.nextId++,
                    name: importSnippet.name,
                    code: importSnippet.code,
                    created: importSnippet.created || new Date().toISOString(),
                    updated: importSnippet.updated
                };

                this.snippets.push(snippet);
                importCount++;
            }

            if (importCount > 0) {
                await this.saveSnippets();
                this.renderSnippets();
            }

            // Закрываем универсальное модальное окно
            const modal = document.getElementById('importExportModal');
            if (modal) {
                modal.classList.remove('show');
            }

            if (importCount === 0) {
                this.showMessage('Нет новых сниппетов для импорта', 'info');
            } else {
                let message = `Импортировано ${importCount} сниппетов`;
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

    renderSnippets() {
        const container = document.getElementById('snippetsList');
        if (!container) return;
        
        if (this.snippets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-title">Нет сниппетов</div>
                    <div class="empty-state-description">
                        Создайте первый сниппет кода для быстрого выполнения
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.snippets.map((snippet) => `
            <div class="snippet-item" data-snippet-id="${snippet.id}">
                <div class="snippet-content">
                    <div class="snippet-name">${this.escapeHtml(snippet.name)}</div>
                    <div class="snippet-preview">${this.escapeHtml(this.getCodePreview(snippet.code))}</div>
                </div>
                <div class="snippet-actions">
                    <button class="btn-execute" title="Выполнить код">▶</button>
                    <button class="btn-edit" title="Редактировать">✎</button>
                    <button class="btn-delete" title="Удалить">×</button>
                </div>
            </div>
        `).join('');

        // Привязываем события для каждого сниппета
        this.snippets.forEach((snippet) => {
            const element = container.querySelector(`[data-snippet-id="${snippet.id}"]`);
            if (!element) return;
            
            // Кнопка выполнения
            const executeBtn = element.querySelector('.btn-execute');
            if (executeBtn) {
                executeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.executeSnippet(snippet);
                });
            }

            // Кнопка редактирования
            const editBtn = element.querySelector('.btn-edit');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openAddSnippetModal(snippet);
                });
            }

            // Кнопка удаления
            const deleteBtn = element.querySelector('.btn-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Удалить сниппет?')) {
                        this.removeSnippet(snippet.id);
                    }
                });
            }

            // Клик по сниппету для выполнения
            const content = element.querySelector('.snippet-content');
            if (content) {
                content.addEventListener('click', () => {
                    this.executeSnippet(snippet);
                });
            }
        });
    }

    getCodePreview(code) {
        // Убираем теги PHP и показываем первую строку кода
        const cleanCode = code.replace(/<\?php\s*/i, '').trim();
        const firstLine = cleanCode.split('\n')[0].replace(/^\/\/\s*/, '');
        return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(text, type = 'info') {
        // Используем общий элемент сообщений
        const message = document.getElementById('message');
        if (!message) return;
        
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
}

// Глобальная переменная для доступа к менеджеру сниппетов
let snippetManager = null;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем только после полной загрузки
    setTimeout(() => {
        snippetManager = new SnippetManager();
        // Делаем доступным глобально для других модулей
        window.snippetManager = snippetManager;
    }, 100);
});
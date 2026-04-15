class OptionsManager {
    constructor() {
        this.browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        this.currentSite = 'localhost';
        
        // Проверяем доступность settings при инициализации
        if (!window.settings) {
            console.warn('Settings не загружены при инициализации OptionsManager');
        }
        
        this.init();
    }

    async init() {
        await this.loadCurrentSite();
        await this.loadState();
        this.bindEvents();
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
            }

    async loadState() {
        try {
            let result;
            if (typeof browser !== 'undefined') {
                result = await this.browserAPI.storage.local.get(['bitrixOptions']);
            } else {
                result = await new Promise((resolve) => {
                    this.browserAPI.storage.local.get(['bitrixOptions'], resolve);
                });
            }
            
            const options = result.bitrixOptions || { module: '', name: '', value: '' };
            if (options.module) document.getElementById('optionModule').value = options.module;
            if (options.name) document.getElementById('optionName').value = options.name;
            if (options.value) document.getElementById('optionValue').value = options.value;

            try {
                let presetsResult;
                if (typeof browser !== 'undefined') {
                    presetsResult = await this.browserAPI.storage.local.get(['bitrixOptionPresets']);
                } else {
                    presetsResult = await new Promise((resolve) => {
                        this.browserAPI.storage.local.get(['bitrixOptionPresets'], resolve);
                    });
                }
                this.presets = presetsResult.bitrixOptionPresets || [];
                if (this.presets.length > 0) {
                    this.nextPresetId = Math.max(...this.presets.map(p => p.id || 0)) + 1;
                } else {
                    this.nextPresetId = 1;
                }
                this.renderPresets();
            } catch (err) {
                console.error('Ошибка загрузки пресетов:', err);
                this.presets = [];
                this.nextPresetId = 1;
            }
        } catch (error) {
            console.error('Ошибка загрузки состояния опций:', error);
        }
    }

    async saveState() {
        const state = {
            module: document.getElementById('optionModule')?.value.trim() || '',
            name: document.getElementById('optionName')?.value.trim() || '',
            value: document.getElementById('optionValue')?.value || ''
        };
        try {
            if (typeof browser !== 'undefined') {
                await this.browserAPI.storage.local.set({bitrixOptions: state});
            } else {
                await new Promise((resolve) => {
                    this.browserAPI.storage.local.set({bitrixOptions: state}, resolve);
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения состояния опций:', error);
        }
    }

    bindEvents() {
        const getBtn = document.getElementById('getOptionBtn');
        const setBtn = document.getElementById('setOptionBtn');
        const savePresetBtn = document.getElementById('saveOptionPresetBtn');
        const inputs = ['optionModule', 'optionName', 'optionValue'];

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.saveState());
            }
        });

        if (getBtn) {
            getBtn.addEventListener('click', () => this.handleGetOption());
        }

        if (setBtn) {
            setBtn.addEventListener('click', () => this.handleSetOption());
        }

        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', () => this.savePreset());
        }
    }

    showMessage(text, type = 'info') {
        const message = document.getElementById('message');
        if (!message) return;
        message.textContent = text;
        message.className = `message ${type}`;
        message.classList.add('show');
        setTimeout(() => message.classList.remove('show'), 3000);
    }

    async savePresets() {
        try {
            if (typeof browser !== 'undefined') {
                await this.browserAPI.storage.local.set({bitrixOptionPresets: this.presets});
            } else {
                await new Promise((resolve) => {
                    this.browserAPI.storage.local.set({bitrixOptionPresets: this.presets}, resolve);
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения пресетов:', error);
        }
    }

    async savePreset() {
        const module = document.getElementById('optionModule').value.trim();
        const name = document.getElementById('optionName').value.trim();
        const value = document.getElementById('optionValue').value.trim();

        if (!module || !name) {
            this.showMessage('Укажите модуль и название для сохранения', 'error');
            return;
        }

        const exists = this.presets.find(p => p.module === module && p.name === name);
        if (exists) {
            exists.value = value;
            this.showMessage('Пресет обновлен', 'success');
        } else {
            this.presets.push({
                id: this.nextPresetId++,
                module,
                name,
                value
            });
            this.showMessage('Пресет сохранен', 'success');
        }
        
        await this.savePresets();
        this.renderPresets();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderPresets() {
        const container = document.getElementById('optionsPresetList');
        if (!container) return;
        
        if (!this.presets || this.presets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-title" style="margin-top:0;">Нет сохраненных опций</div>
                </div>
            `;
            return;
        }

        container.innerHTML = '<h4 style="margin: 0 0 10px 5px; font-size: 12px; color: var(--text-color);">Сохраненные опции</h4>' + this.presets.map((preset) => `
            <div class="snippet-item" data-preset-id="${preset.id}">
                <div class="snippet-content" style="cursor: pointer;" title="Подставить опцию">
                    <div class="snippet-name">${this.escapeHtml(preset.module)} / ${this.escapeHtml(preset.name)}</div>
                    ${preset.value ? `<div class="snippet-preview" style="color: #888; font-size: 11px;">${this.escapeHtml(preset.value)}</div>` : ''}
                </div>
                <div class="snippet-actions">
                    <button class="btn-delete" title="Удалить">×</button>
                </div>
            </div>
        `).join('');

        // Привязываем события
        this.presets.forEach(preset => {
            const el = container.querySelector(`[data-preset-id="${preset.id}"]`);
            if (!el) return;
            
            const content = el.querySelector('.snippet-content');
            if (content) {
                content.addEventListener('click', () => {
                    document.getElementById('optionModule').value = preset.module;
                    document.getElementById('optionName').value = preset.name;
                    if (preset.value !== undefined) {
                        document.getElementById('optionValue').value = preset.value;
                    }
                    this.saveState();
                    this.showMessage('Опция подставлена', 'success');
                });
            }

            const deleteBtn = el.querySelector('.btn-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Удалить пресет?')) {
                        this.presets = this.presets.filter(p => p.id !== preset.id);
                        await this.savePresets();
                        this.renderPresets();
                        this.showMessage('Пресет удален', 'success');
                    }
                });
            }
        });
    }

    async executeAndGetResult(code) {
        try {
            if (!window.settings) {
                this.showMessage('Настройки (настройках) не загружены', 'error');
                return null;
            }
            
            const executionPath = window.settings?.php_execution_path || '/admin/debug.php';
            
            let currentTabId = null;
            let currentSiteUrl = '';
            
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
                    currentTabId = tabs[0].id;
                    const url = new URL(tabs[0].url);
                    currentSiteUrl = url.origin;
                }
            } catch (e) {
                console.warn('Не удалось получить данные текущей вкладки:', e);
            }

            if (!currentTabId) {
                this.showMessage('Нет текущей активной вкладки', 'error');
                return null;
            }
            
            const encodedCode = encodeURIComponent(code);
            const executionUrl = `${currentSiteUrl}${executionPath}?PHPCode=y&CODE=${encodedCode}`;

            // Выполняем код через создание скрытого iframe на текущей странице.
            // Это обходит ограничения CORS, не требует явных разрешений в manifest.json
            // для всех хостов и работает как загрузка отдельной страницы.
            let actualResult = null;
            try {
                let contentResults;
                if (this.browserAPI.scripting) {
                    contentResults = await this.browserAPI.scripting.executeScript({
                        target: { tabId: currentTabId },
                        func: async (url) => {
                            return new Promise((resolve) => {
                                const iframe = document.createElement('iframe');
                                iframe.style.display = 'none';
                                iframe.src = url;
                                
                                let resolved = false;
                                const finish = (result) => {
                                    if (resolved) return;
                                    resolved = true;
                                    if (iframe.parentNode) {
                                        document.body.removeChild(iframe);
                                    }
                                    resolve(result);
                                };

                                iframe.onload = () => {
                                    try {
                                        const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                        const text = doc ? (doc.documentElement.innerText || doc.body.innerText) : "";
                                        finish(text);
                                    } catch (e) {
                                        finish('Error: ' + e.message);
                                    }
                                };

                                iframe.onerror = () => {
                                    finish('Error: Не удалось загрузить iframe');
                                };

                                document.body.appendChild(iframe);

                                setTimeout(() => {
                                    finish('Error: Timeout loading iframe');
                                }, 15000); // Тайм-аут 15 сек
                            });
                        },
                        args: [executionUrl]
                    });
                } else {
                    contentResults = await new Promise((resolve) => {
                        this.browserAPI.tabs.executeScript(currentTabId, {
                            code: `
                            (async () => {
                                return new Promise((resolve) => {
                                    const iframe = document.createElement('iframe');
                                    iframe.style.display = 'none';
                                    iframe.src = '${executionUrl.replace(/'/g, "\\'")}';
                                    
                                    let resolved = false;
                                    const finish = (result) => {
                                        if (resolved) return;
                                        resolved = true;
                                        if (iframe.parentNode) document.body.removeChild(iframe);
                                        resolve(result);
                                    };

                                    iframe.onload = () => {
                                        try {
                                            const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                            const text = doc ? (doc.documentElement.innerText || doc.body.innerText) : "";
                                            finish(text);
                                        } catch (e) {
                                            finish('Error: ' + e.message);
                                        }
                                    };

                                    iframe.onerror = () => finish('Error: iframe load failed');
                                    document.body.appendChild(iframe);
                                    setTimeout(() => finish('Error: Timeout'), 15000);
                                });
                            })();`
                        }, resolve);
                    });
                }
                
                if (contentResults && contentResults[0]) {
                    actualResult = contentResults[0].result;
                }
            } catch (err) {
                console.error('Ошибка при извлечении контента через iframe:', err);
                actualResult = 'Error: ' + err.message;
            }

            return actualResult;
            
        } catch (error) {
            console.error('Ошибка выполнения кода:', error);
            this.showMessage('Ошибка выполнения: ' + error.message, 'error');
            return null;
        }
    }

    async handleGetOption() {
        const module = document.getElementById('optionModule').value.trim();
        const name = document.getElementById('optionName').value.trim();
        const getBtn = document.getElementById('getOptionBtn');

        if (!module || !name) {
            this.showMessage('Укажите модуль и название опции', 'error');
            return;
        }

        const safeModule = module.replace(/(['"\\])/g, '\\$1');
        const safeName = name.replace(/(['"\\])/g, '\\$1');

        // Разбиваем строку маркера в коде, чтобы регулярка не нашла её саму в исходном коде, 
        // который Bitrix может выводить на страницу
        const code = `$val = \\Bitrix\\Main\\Config\\Option::get('${safeModule}', '${safeName}'); echo '---R' . 'ES---' . $val . '---EN' . 'DRES---';`;

        if (getBtn) getBtn.textContent = '...';
        const result = await this.executeAndGetResult(code);
        if (getBtn) getBtn.textContent = 'Получить';

        if (result !== null && !result.startsWith('Error:')) {
            const match = result.match(/---RES---([\s\S]*?)---ENDRES---/);
            let actualValue = '';
            if (match) {
                actualValue = match[1];
            } else {
                const parts = result.split('---RES---');
                actualValue = parts.length > 1 ? parts.pop() : result;
                // отрезаем возможный мусор если нет ENDRES
                actualValue = actualValue.split('---ENDRES---')[0]; 
            }
            
            document.getElementById('optionValue').value = actualValue.trim();
            this.saveState();
            this.showMessage('Значение получено', 'success');
        } else if (result) {
            this.showMessage('Ошибка сервера: не удалось получить данные', 'error');
        }
    }

    async handleSetOption() {
        const module = document.getElementById('optionModule').value.trim();
        const name = document.getElementById('optionName').value.trim();
        const value = document.getElementById('optionValue').value;
        const setBtn = document.getElementById('setOptionBtn');

        if (!module || !name) {
            this.showMessage('Укажите модуль и название опции', 'error');
            return;
        }

        const safeModule = module.replace(/(['"\\])/g, '\\$1');
        const safeName = name.replace(/(['"\\])/g, '\\$1');
        const safeValue = value.replace(/(['"\\])/g, '\\$1');

        const code = `\\Bitrix\\Main\\Config\\Option::set('${safeModule}', '${safeName}', '${safeValue}');`;

        if (setBtn) setBtn.textContent = '...';
        const result = await this.executeAndGetResult(code);
        if (setBtn) setBtn.textContent = 'Установить';

        if (result !== null && !result.startsWith('Error:')) {
            this.showMessage('Опция успешно обновлена', 'success');
        } else if (result) {
            this.showMessage('Ошибка сервера: обновление не удалось', 'error');
        }
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new OptionsManager();
    }, 100);
});

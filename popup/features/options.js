class OptionsManager {
    constructor() {
        this.browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        this.currentSite = 'localhost';
        this.presets = [];
        this.nextPresetId = 1;
        this.savedValues = {};
        
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
                result = await this.browserAPI.storage.local.get([
                    'bitrixOptions',
                    'bitrixOptionPresets',
                    'bitrixOptionValues'
                ]);
            } else {
                result = await new Promise((resolve) => {
                    this.browserAPI.storage.local.get([
                        'bitrixOptions',
                        'bitrixOptionPresets',
                        'bitrixOptionValues'
                    ], resolve);
                });
            }
            
            const options = result.bitrixOptions || { module: '', name: '', value: '' };
            if (options.module) document.getElementById('optionModule').value = options.module;
            if (options.name) document.getElementById('optionName').value = options.name;
            if (options.value) document.getElementById('optionValue').value = options.value;

            this.presets = Array.isArray(result.bitrixOptionPresets) ? result.bitrixOptionPresets : [];
            this.nextPresetId = this.presets.length > 0
                ? Math.max(...this.presets.map(p => p.id || 0)) + 1
                : 1;
            this.savedValues = this.normalizeSavedValues(result.bitrixOptionValues);

            this.renderPresets();
            this.renderValueSelector();
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
        const deleteBtn = document.getElementById('deleteOptionBtn');
        const savePresetBtn = document.getElementById('saveOptionPresetBtn');
        const optionModuleInput = document.getElementById('optionModule');
        const optionNameInput = document.getElementById('optionName');
        const optionValueInput = document.getElementById('optionValue');
        const optionValuePicker = document.getElementById('optionValuePicker');

        [optionModuleInput, optionNameInput].forEach((el) => {
            el?.addEventListener('input', () => {
                this.saveState();
                this.renderValueSelector();
            });
        });

        optionValueInput?.addEventListener('input', () => {
            this.saveState();
            this.renderValueSelector(true);
        });

        optionValueInput?.addEventListener('focus', () => {
            this.renderValueSelector(true);
        });

        optionValueInput?.addEventListener('click', () => {
            this.renderValueSelector(true);
        });

        optionValueInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideValueSelector();
            }
        });

        [optionModuleInput, optionNameInput, optionValueInput].forEach((el) => {
            el?.addEventListener('paste', (event) => this.handleOptionPaste(event));
        });

        if (getBtn) {
            getBtn.addEventListener('click', () => this.handleGetOption());
        }

        if (setBtn) {
            setBtn.addEventListener('click', () => this.handleSetOption());
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDeleteOption());
        }

        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', () => this.savePreset());
        }

        document.addEventListener('click', (event) => {
            if (optionValuePicker && !optionValuePicker.contains(event.target)) {
                this.hideValueSelector();
            }
        });
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

    async saveSavedValues() {
        try {
            if (typeof browser !== 'undefined') {
                await this.browserAPI.storage.local.set({bitrixOptionValues: this.savedValues});
            } else {
                await new Promise((resolve) => {
                    this.browserAPI.storage.local.set({bitrixOptionValues: this.savedValues}, resolve);
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения значений опций:', error);
        }
    }

    normalizeSavedValues(rawValues) {
        if (!rawValues || typeof rawValues !== 'object') {
            return {};
        }

        return Object.entries(rawValues).reduce((acc, [key, values]) => {
            if (!Array.isArray(values)) {
                return acc;
            }

            const uniqueValues = [...new Set(values.filter(value => typeof value === 'string'))];
            if (uniqueValues.length > 0) {
                acc[key] = uniqueValues;
            }
            return acc;
        }, {});
    }

    getOptionKey(module, name) {
        if (!module || !name) {
            return '';
        }
        return `${module}::${name}`;
    }

    getCurrentOptionData() {
        return {
            module: document.getElementById('optionModule')?.value.trim() || '',
            name: document.getElementById('optionName')?.value.trim() || '',
            value: document.getElementById('optionValue')?.value || ''
        };
    }

    getCurrentSavedValues() {
        const { module, name } = this.getCurrentOptionData();
        const key = this.getOptionKey(module, name);
        return key ? (this.savedValues[key] || []) : [];
    }

    unescapePhpString(value, quote) {
        if (!value) {
            return '';
        }

        const quotePattern = new RegExp(`\\\\${quote}`, 'g');
        return value
            .replace(/\\\\/g, '\\')
            .replace(quotePattern, quote);
    }

    parseOptionExpression(rawValue) {
        if (!rawValue) {
            return null;
        }

        const normalizedValue = rawValue.trim();
        const optionRegexp = /^(?:COption::SetOptionString|\\?Bitrix\\Main\\Config\\Option::set)\(\s*(['"])((?:\\.|(?!\1)[\s\S])*)\1\s*,\s*(['"])((?:\\.|(?!\3)[\s\S])*)\3\s*,\s*(['"])((?:\\.|(?!\5)[\s\S])*)\5(?:\s*,[\s\S]*)?\)\s*;?\s*$/;
        const match = normalizedValue.match(optionRegexp);
        if (!match) {
            return null;
        }

        return {
            module: this.unescapePhpString(match[2], match[1]),
            name: this.unescapePhpString(match[4], match[3]),
            value: this.unescapePhpString(match[6], match[5])
        };
    }

    applyParsedOption(parsedOption) {
        if (!parsedOption) {
            return;
        }

        document.getElementById('optionModule').value = parsedOption.module;
        document.getElementById('optionName').value = parsedOption.name;
        document.getElementById('optionValue').value = parsedOption.value;
        this.hideValueSelector();
        this.renderValueSelector();
        this.saveState();
        this.showMessage('Опция разложена по полям', 'success');
    }

    handleOptionPaste(event) {
        const pastedText = event.clipboardData?.getData('text');
        const parsedOption = this.parseOptionExpression(pastedText);
        if (!parsedOption) {
            return;
        }

        event.preventDefault();
        this.applyParsedOption(parsedOption);
    }

    async removeSavedValue(valueToRemove) {
        const { module, name } = this.getCurrentOptionData();
        const key = this.getOptionKey(module, name);
        if (!key) {
            return;
        }

        const values = this.savedValues[key] || [];
        const nextValues = values.filter((value) => value !== valueToRemove);

        if (nextValues.length > 0) {
            this.savedValues[key] = nextValues;
        } else {
            delete this.savedValues[key];
        }

        await this.saveSavedValues();
        this.renderValueSelector(true);
        this.showMessage('Значение удалено', 'success');
    }

    renderValueSelector(forceOpen = false) {
        const dropdown = document.getElementById('optionSavedValues');
        const picker = document.getElementById('optionValuePicker');
        const input = document.getElementById('optionValue');
        if (!dropdown || !picker || !input) return;

        const { module, name } = this.getCurrentOptionData();
        const key = this.getOptionKey(module, name);
        const values = key ? (this.savedValues[key] || []) : [];

        dropdown.replaceChildren();

        if (!key || values.length === 0) {
            this.hideValueSelector();
            return;
        }

        values.forEach((savedValue) => {
            const option = document.createElement('div');
            option.className = 'option-value-option';

            const label = document.createElement('div');
            label.className = 'option-value-option-label';
            label.textContent = savedValue;
            label.title = savedValue;
            label.addEventListener('mousedown', (event) => {
                event.preventDefault();
                this.applySelectedValue(savedValue);
            });

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'option-value-delete';
            deleteButton.title = 'Удалить значение';
            deleteButton.textContent = '×';
            deleteButton.addEventListener('mousedown', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await this.removeSavedValue(savedValue);
            });

            option.appendChild(label);
            option.appendChild(deleteButton);
            dropdown.appendChild(option);
        });

        if (forceOpen) {
            picker.classList.add('open');
        }
    }

    hideValueSelector() {
        document.getElementById('optionValuePicker')?.classList.remove('open');
    }

    syncValueSelectorSelection() {
        this.renderValueSelector();
    }

    applySelectedValue(value) {
        const valueInput = document.getElementById('optionValue');
        if (!valueInput) return;

        valueInput.value = value;
        this.saveState();
        this.hideValueSelector();
        this.showMessage('Значение подставлено', 'success');
    }

    async savePreset() {
        const module = document.getElementById('optionModule').value.trim();
        const name = document.getElementById('optionName').value.trim();
        const value = document.getElementById('optionValue').value;

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
        if (value) {
            const key = this.getOptionKey(module, name);
            const existingValues = this.savedValues[key] || [];
            if (!existingValues.includes(value)) {
                this.savedValues[key] = [value, ...existingValues];
                await this.saveSavedValues();
            }
            this.renderValueSelector();
        }
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
                    this.renderValueSelector();
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
            this.hideValueSelector();
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

    async handleDeleteOption() {
        const module = document.getElementById('optionModule').value.trim();
        const name = document.getElementById('optionName').value.trim();
        const deleteBtn = document.getElementById('deleteOptionBtn');

        if (!module || !name) {
            this.showMessage('Укажите модуль и название опции', 'error');
            return;
        }

        if (!confirm(`Удалить опцию "${name}" у модуля "${module}" на портале?`)) {
            return;
        }

        const safeModule = module.replace(/(['"\\])/g, '\\$1');
        const safeName = name.replace(/(['"\\])/g, '\\$1');
        const code = `\\Bitrix\\Main\\Config\\Option::delete('${safeModule}', ['name' => '${safeName}']); echo '---R' . 'ES---OK---EN' . 'DRES---';`;

        if (deleteBtn) deleteBtn.textContent = '...';
        const result = await this.executeAndGetResult(code);
        if (deleteBtn) deleteBtn.textContent = 'Удалить';

        if (result !== null && !result.startsWith('Error:')) {
            document.getElementById('optionValue').value = '';
            this.hideValueSelector();
            this.saveState();
            this.showMessage('Опция удалена на портале', 'success');
        } else if (result) {
            this.showMessage('Ошибка сервера: удаление не удалось', 'error');
        }
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new OptionsManager();
    }, 100);
});

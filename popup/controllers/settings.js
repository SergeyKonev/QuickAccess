(function () {
    class SettingsController {
        constructor({ messageService }) {
            this.messageService = messageService;
            this.render();
        }

        render() {
            const container = document.getElementById('settingsFormContainer');
            if (!container) return;

            const schema = window.settingsSchema || [];
            const s = window.settings || {};

            container.innerHTML = '';

            for (const item of schema) {
                if (item === '---') {
                    container.appendChild(this.createDivider());
                    continue;
                }

                if (item.type === 'coupons') {
                    container.appendChild(this.createCouponsField(item, s[item.key] || []));
                } else {
                    container.appendChild(this.createInputField(item, s[item.key] || ''));
                }
            }

            // Кнопки
            const actions = document.createElement('div');
            actions.className = 'settings-actions';
            actions.innerHTML = `
                <button id="resetSettingsBtn" class="btn btn-secondary">Сбросить</button>
                <button id="saveSettingsBtn" class="btn btn-primary">Сохранить</button>
            `;
            container.appendChild(actions);

            document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
            document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetToDefaults());
        }

        createInputField(item, currentValue) {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `
                <label class="form-label" for="setting_${item.key}">${this.esc(item.label)}</label>
                <input type="${item.type === 'password' ? 'password' : 'text'}"
                       id="setting_${item.key}"
                       class="form-control"
                       data-key="${item.key}"
                       value="${this.escAttr(String(currentValue))}">
            `;
            return group;
        }

        createCouponsField(item, coupons) {
            const group = document.createElement('div');
            group.className = 'form-group';

            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = item.label;
            group.appendChild(label);

            const listContainer = document.createElement('div');
            listContainer.id = `coupons_${item.key}`;
            listContainer.dataset.key = item.key;
            group.appendChild(listContainer);

            (coupons || []).forEach(c => this.appendCouponRow(listContainer, c.name, c.value));

            const addBtn = document.createElement('button');
            addBtn.className = 'btn btn-secondary full-width';
            addBtn.style.marginTop = '6px';
            addBtn.textContent = '+ Добавить купон';
            addBtn.addEventListener('click', () => this.appendCouponRow(listContainer, '', ''));
            group.appendChild(addBtn);

            return group;
        }

        appendCouponRow(container, name, value) {
            const row = document.createElement('div');
            row.className = 'coupon-row';
            row.innerHTML = `
                <input type="text" class="form-control coupon-name" placeholder="Название" value="${this.escAttr(name)}">
                <input type="text" class="form-control coupon-value" placeholder="Купон" value="${this.escAttr(value)}">
                <button class="btn-icon btn-remove-coupon" title="Удалить">\u00d7</button>
            `;
            row.querySelector('.btn-remove-coupon').addEventListener('click', () => row.remove());
            container.appendChild(row);
        }

        createDivider() {
            const hr = document.createElement('hr');
            hr.className = 'settings-divider';
            return hr;
        }

        collectValues() {
            const schema = window.settingsSchema || [];
            const result = {};

            for (const item of schema) {
                if (typeof item === 'string') continue;

                if (item.type === 'coupons') {
                    const container = document.getElementById(`coupons_${item.key}`);
                    if (!container) continue;
                    const coupons = [];
                    container.querySelectorAll('.coupon-row').forEach(row => {
                        const n = row.querySelector('.coupon-name')?.value?.trim();
                        const v = row.querySelector('.coupon-value')?.value?.trim();
                        if (n && v) coupons.push({ name: n, value: v });
                    });
                    result[item.key] = coupons;
                } else {
                    const input = document.getElementById(`setting_${item.key}`);
                    result[item.key] = input?.value?.trim() || '';
                }
            }

            return result;
        }

        async saveSettings() {
            try {
                await window.settingsLoader.saveSettings(this.collectValues());
                this.messageService?.show('Настройки сохранены', 'success');
            } catch (error) {
                this.messageService?.show('Ошибка сохранения настроек', 'error');
            }
        }

        resetToDefaults() {
            const defaults = window.settingsLoader.getDefaults();
            Object.assign(window.settings, defaults);
            this.render();
            this.messageService?.show('Настройки сброшены на дефолтные', 'info');
        }

        esc(str) {
            const d = document.createElement('div');
            d.textContent = str;
            return d.innerHTML;
        }

        escAttr(str) {
            return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    }

    window.SettingsController = SettingsController;
})();

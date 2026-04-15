(function () {
    class TariffController {
        constructor({ messageService }) {
            this.messageService = messageService;
        }

        populateTariffCoupons() {
            const selectElement = document.getElementById('tariffCouponSelect');
            if (!selectElement) return;

            const coupons = window.settings?.license_coupons || [];
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
                this.messageService?.show('Выберите тариф', 'error');
                return;
            }

            try {
                const tabs = await window.qaBrowser.queryActiveTab();
                const tabId = tabs?.[0]?.id;
                if (!tabId) {
                    this.messageService?.show('Активная вкладка не найдена', 'error');
                    return;
                }

                if (!window.qaBrowser.browserAPI.scripting?.executeScript) {
                    this.messageService?.show('API scripting недоступен', 'error');
                    return;
                }

                const results = await window.qaBrowser.browserAPI.scripting.executeScript({
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
                    this.messageService?.show('Команда активации отправлена. Перезагрузите вкладку через Ctrl+F5', 'success');
                } else {
                    this.messageService?.show(result?.error || 'Не удалось выполнить активацию', 'error');
                }
            } catch (error) {
                console.error('Ошибка активации тарифа:', error);
                this.messageService?.show('Ошибка выполнения в активной вкладке', 'error');
            }
        }

        async marketSubscription(action) {
            const actionName = action === 1 ? 'установки' : 'снятия';

            if (!window.settings?.market_subscription_url || !window.settings?.network_email || !window.settings?.network_password) {
                this.messageService?.show('Настройки подписки маркета не заполнены (вкладка ⚙)', 'error');
                return;
            }

            try {
                const tabs = await window.qaBrowser.queryActiveTab();
                const tabUrl = tabs?.[0]?.url;
                if (!tabUrl) {
                    this.messageService?.show('Активная вкладка не найдена', 'error');
                    return;
                }

                const hostname = new URL(tabUrl).hostname;
                const portalUri = `https://${hostname}/`;

                if (!isSafeUrl(window.settings.market_subscription_url)) {
                    this.messageService?.show('Небезопасный URL подписки маркета', 'error');
                    return;
                }

                const result = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'MARKET_SUBSCRIPTION',
                        url: window.settings.market_subscription_url,
                        body: {
                            PortalUri: portalUri,
                            Action: action,
                            Requester: {
                                Email: window.settings.network_email,
                                Password: window.settings.network_password
                            }
                        }
                    }, resolve);
                });

                if (result?.success) {
                    this.messageService?.show(`Подписка: ${result.text || 'OK'}`, 'success');
                } else {
                    this.messageService?.show(`Ошибка ${actionName} подписки: ${result?.error || 'Неизвестная ошибка'}`, 'error');
                }
            } catch (error) {
                console.error(`Ошибка ${actionName} подписки маркета:`, error);
                this.messageService?.show(`Ошибка ${actionName} подписки: ${error.message}`, 'error');
            }
        }
    }

    window.TariffController = TariffController;
})();

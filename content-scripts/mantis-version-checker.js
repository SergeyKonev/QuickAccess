(() => {
	const BUTTON_ID = 'qa-etalon-version-btn';
	const TARGET_INPUT_XPATH = "//input[@name='custom_field_17']";
	const TARGET_TD_XPATH = "//input[@name='custom_field_17']//ancestor::td";
	const CATEGORY_SELECT_SELECTOR = "select[name='category']";
	const ETALON_URL = 'https://etalon.bitrix24.ru/aqua/aquaversion.php';
	const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
	const STYLE_ID = 'qa-etalon-version-style';

	const evaluateXPath = (xpath, context = document) => {
		return document.evaluate(
			xpath,
			context,
			null,
			XPathResult.FIRST_ORDERED_NODE_TYPE,
			null
		).singleNodeValue;
	};

	const getTargetInput = () => evaluateXPath(TARGET_INPUT_XPATH);
	const getTargetTd = () => evaluateXPath(TARGET_TD_XPATH);

	const showToastSafe = (message) => {
		if (typeof showToast === 'function') {
			showToast(message);
		}
	};

	const ensureStyles = () => {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			.qa-etalon-btn {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				gap: 6px;
				padding: 4px 10px;
				border-radius: 6px;
				border: 1px solid rgba(94, 82, 64, 0.2);
				background: rgba(94, 82, 64, 0.12);
				color: #13343b;
				font-size: 12px;
				font-weight: 500;
				cursor: pointer;
				transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
			}
			.qa-etalon-btn:hover {
				background: rgba(94, 82, 64, 0.2);
				border-color: rgba(94, 82, 64, 0.3);
			}
			.qa-etalon-btn:active {
				background: rgba(94, 82, 64, 0.25);
				transform: translateY(1px);
			}
			.qa-etalon-btn:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}
			.qa-etalon-btn__dot {
				width: 8px;
				height: 8px;
				border-radius: 999px;
				background: #21808d;
				box-shadow: 0 0 0 2px rgba(33, 128, 141, 0.2);
			}
		`;
		document.head.appendChild(style);
	};

	const setButtonState = (button, { loading, message }) => {
		if (!button) return;
		if (typeof loading === 'boolean') {
			button.disabled = loading;
			button.dataset.loading = loading ? '1' : '0';
		}
		if (message) {
			button.title = message;
		}
	};

	const createButton = () => {
		ensureStyles();
		const button = document.createElement('button');
		button.id = BUTTON_ID;
		button.type = 'button';
		button.className = 'button';
		button.innerHTML = '<span>Версия на эталоне</span>';
		button.style.marginLeft = '8px';
		button.addEventListener('click', () => handleClick(button));
		return button;
	};

	const fetchEtalonXml = async () => {
		if (!browserAPI?.runtime?.sendMessage) {
			throw new Error('runtime.sendMessage недоступен');
		}

		let response;
		if (typeof browser !== 'undefined') {
			response = await browserAPI.runtime.sendMessage({ type: 'FETCH_ETALON_XML' });
		} else {
			response = await new Promise((resolve) => {
				browserAPI.runtime.sendMessage({ type: 'FETCH_ETALON_XML' }, (result) => {
					const lastError = browserAPI.runtime?.lastError;
					if (lastError) {
						resolve({ success: false, error: lastError.message || 'Message failed' });
						return;
					}
					resolve(result);
				});
			});
		}

		if (!response?.success) {
			throw new Error(response?.error || 'Ошибка загрузки XML');
		}

		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(response.xmlText, 'text/xml');
		return xmlDoc;
	};

	const findModuleVersion = (xmlDoc, moduleName) => {
		const modules = Array.from(xmlDoc.getElementsByTagName('module'));
		const target = moduleName.trim();
		const match = modules.find((moduleNode) => {
			const idNode = moduleNode.getElementsByTagName('id')[0];
			const id = idNode ? idNode.textContent.trim() : '';
			return id === target;
		});

		const versionNode = match?.getElementsByTagName('version')[0];
		const version = versionNode ? versionNode.textContent.trim() : '';
		return version || null;
	};

	const handleClick = async (button) => {
		const select = document.querySelector(CATEGORY_SELECT_SELECTOR);
		const moduleName = select?.value?.trim();

		if (!moduleName) {
			setButtonState(button, { message: 'Категория не выбрана' });
			showToastSafe('Категория не выбрана');
			return;
		}

		setButtonState(button, { loading: true, message: 'Загрузка версии...' });

		try {
			const xmlDoc = await fetchEtalonXml();
			const version = findModuleVersion(xmlDoc, moduleName);

			if (!version) {
				const message = `Версия не найдена для ${moduleName}`;
				setButtonState(button, { message });
				showToastSafe(message);
				return;
			}

			const input = getTargetInput();
			if (!input) {
				setButtonState(button, { message: 'Поле версии не найдено' });
				showToastSafe('Поле версии не найдено');
				return;
			}

			input.value = version;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
			setButtonState(button, { message: `Вставлена версия ${version}` });
		} catch (error) {
			console.error('Ошибка получения версии с эталона:', error);
			setButtonState(button, { message: 'Ошибка загрузки версии' });
			showToastSafe('Ошибка загрузки версии');
		} finally {
			setButtonState(button, { loading: false });
		}
	};

	const insertButtonIfNeeded = () => {
		const td = getTargetTd();
		if (!td) return false;

		if (td.querySelector(`#${BUTTON_ID}`)) {
			return true;
		}

		const button = createButton();
		const input = getTargetInput();
		if (input?.parentElement) {
			input.parentElement.appendChild(button);
		} else {
			td.appendChild(button);
		}

		return true;
	};

	const init = () => {
		if (insertButtonIfNeeded()) return;

		const observer = new MutationObserver(() => {
			if (insertButtonIfNeeded()) {
				observer.disconnect();
			}
		});

		const root = document.documentElement || document.body;
		if (root) {
			observer.observe(root, { childList: true, subtree: true });
		}
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();

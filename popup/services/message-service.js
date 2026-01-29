(function () {
    class MessageService {
        constructor() {
            this.messageTimeout = null;
        }

        show(text, type = 'info') {
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

    window.MessageService = MessageService;
})();

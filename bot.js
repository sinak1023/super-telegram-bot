import { ethers } from 'ethers';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import chalk from 'chalk';
import fs from 'fs';

dotenv.config();

// شبکه‌های پشتیبانی شده
const NETWORKS = {
    SONEIUM: {
        name: 'Soneium',
        chainId: 1868,
        emoji: '🟡',
        getProvider: (url) => new ethers.JsonRpcProvider(url || process.env.SONEIUM_RPC),
        batchesSupported: false,
    },
    OP: {
        name: 'Optimism',
        chainId: 10,
        emoji: '🔴',
        getProvider: (url) => new ethers.JsonRpcProvider(url || process.env.OP_RPC || 'https://1rpc.io/op'),
        batchesSupported: true,
    },
    INK: {
        name: 'Ink',
        chainId: 57073,
        emoji: '🔵',
        getProvider: (url) => new ethers.JsonRpcProvider(url || process.env.INK_RPC),
        batchesSupported: false,
    },
    LISK: {
        name: 'Lisk',
        chainId: 1135,
        emoji: '🟣',
        getProvider: (url) => new ethers.JsonRpcProvider(url || process.env.LISK_RPC || 'https://rpc.api.lisk.com'),
        batchesSupported: false,
    },
    BASE: {
        name: 'Base',
        chainId: 8453,
        emoji: '🔷',
        getProvider: (url) => new ethers.JsonRpcProvider(url || process.env.BASE_RPC || 'https://mainnet.base.org'),
        batchesSupported: true,
    },
    UNICHAIN: {
        name: 'UniChain',
        chainId: 130,
        emoji: '🟢',
        getProvider: (url) => new ethers.JsonRpcProvider(url || process.env.UNICHAIN_RPC),
        batchesSupported: false,
    },
    // شبکه‌های جدید اضافه شده
    MODE: {
        name: 'Mode',
        chainId: 34443,
        emoji: '🟤',
        getProvider: (url) => new ethers.JsonRpcProvider(url || process.env.MODE_RPC || 'https://mode.drpc.org'),
        batchesSupported: false,
    },
    WORLDCHAIN: {
        name: 'World Chain',
        chainId: 480,
        emoji: '🌍',
        getProvider: (url) => new ethers.JsonRpcProvider(url || process.env.WORLDCHAIN_RPC || 'https://worldchain.drpc.org'),
        batchesSupported: false,
    }
};

class TelegramTransferBot {
    constructor() {
        this.bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
        this.adminId = process.env.ADMIN_CHAT_ID;

        // تنظیمات پیش‌فرض
        this.state = {
            isRunning: false,
            stopRequested: false,
            selectedNetworks: [],
            selectedWallets: [], // تغییر از selectedWallet به selectedWallets
            wallets: [],
            providers: {},
            currentJobs: [], // تغییر از currentJob به currentJobs
            logs: [],
            results: {},
            settings: {
                transactionCount: 250,
                minAmount: "0.000000001", // حداقل مقدار
                maxAmount: "0.000000005", // حداکثر مقدار
                minDelay: 15, // ثانیه
                maxDelay: 30, // ثانیه
                maxRetries: 3,
                retryDelay: 5000
            }
        };

        this.initializeBot();
    }

    async initializeBot() {
        console.log(chalk.green('🤖 Bot started...'));
        await this.loadWallets();
        this.setupCommands();
        this.setupCallbacks();
        this.loadSettings(); // بارگذاری تنظیمات ذخیره شده
    }

    async loadWallets() {
        const privateKeys = [];

        if (process.env.PRIVATE_KEY) {
            privateKeys.push(process.env.PRIVATE_KEY);
        }

        for (let i = 1; i <= 10; i++) {
            const key = process.env[`PRIVATE_KEY_${i}`];
            if (key) {
                privateKeys.push(key);
            }
        }

        this.state.wallets = privateKeys.map((key, index) => ({
            privateKey: key,
            address: new ethers.Wallet(key).address,
            index: index + 1,
            shortAddress: `${new ethers.Wallet(key).address.slice(0, 6)}...${new ethers.Wallet(key).address.slice(-4)}`
        }));
    }

    loadSettings() {
        try {
            if (fs.existsSync('bot-settings.json')) {
                const savedSettings = JSON.parse(fs.readFileSync('bot-settings.json', 'utf8'));
                this.state.settings = { ...this.state.settings, ...savedSettings };
            }
        } catch (error) {
            console.log('Could not load saved settings, using defaults');
        }
    }

    isAdmin(chatId) {
        return chatId.toString() === this.adminId.toString();
    }

    setupCommands() {
        // استارت
        this.bot.onText(/\/start/, (msg) => {
            if (!this.isAdmin(msg.chat.id)) {
                this.bot.sendMessage(msg.chat.id, '⛔ شما مجاز به استفاده از این بات نیستید.');
                return;
            }

            this.showMainMenu(msg.chat.id);
        });

        // منو اصلی
        this.bot.onText(/\/menu/, (msg) => {
            if (!this.isAdmin(msg.chat.id)) return;
            this.showMainMenu(msg.chat.id);
        });
    }

    showMainMenu(chatId) {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '👛 انتخاب کیف پول‌ها', callback_data: 'menu_wallets' },
                    { text: '🌐 انتخاب شبکه', callback_data: 'menu_networks' }
                ],
                [
                    { text: '⚙️ تنظیمات', callback_data: 'menu_settings' },
                    { text: '📊 وضعیت', callback_data: 'menu_status' }
                ],
                [
                    { text: '💰 موجودی‌ها', callback_data: 'menu_balances' },
                    { text: '📈 گزارش آخرین اجرا', callback_data: 'menu_report' }
                ],
                [
                    { text: this.state.isRunning ? '🛑 توقف' : '🚀 شروع',
                      callback_data: this.state.isRunning ? 'action_stop' : 'action_start' }
                ]
            ]
        };

        const status = this.state.isRunning ? '🟢 در حال اجرا' : '🔴 متوقف';
        const selectedWallets = this.state.selectedWallets.length > 0 ?
            `${this.state.selectedWallets.length} کیف پول انتخاب شده` :
            'انتخاب نشده';
        const selectedNetworks = this.state.selectedNetworks.length > 0 ?
            this.state.selectedNetworks.map(n => NETWORKS[n].emoji).join(' ') :
            'انتخاب نشده';

        const message = `
🤖 *کچل گاد مود - منوی اصلی*
━━━━━━━━━━━━━━━━━━━

📊 *وضعیت:* ${status}
👛 *کیف پول‌ها:* ${selectedWallets}
🌐 *شبکه‌ها:* ${selectedNetworks}

━━━━━━━━━━━━━━━━━━━
👨‍💻 @ostadkachal
        `;

        this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    setupCallbacks() {
        this.bot.on('callback_query', async (query) => {
            if (!this.isAdmin(query.message.chat.id)) return;

            const chatId = query.message.chat.id;
            const messageId = query.message.message_id;
            const data = query.data;

            // منوی اصلی
            if (data === 'back_to_menu') {
                this.showMainMenu(chatId);
                this.bot.deleteMessage(chatId, messageId);
                return;
            }

            // منوهای فرعی
            if (data === 'menu_wallets') {
                this.showWalletsMenu(chatId, messageId);
            } else if (data === 'menu_networks') {
                this.showNetworksMenu(chatId, messageId);
            } else if (data === 'menu_settings') {
                this.showSettingsMenu(chatId, messageId);
            } else if (data === 'menu_status') {
                this.showStatus(chatId);
            } else if (data === 'menu_balances') {
                await this.showBalances(chatId);
            } else if (data === 'menu_report') {
                this.showLastReport(chatId);
            }

            // اکشن‌ها
            if (data === 'action_start') {
                await this.startTransfers(chatId);
            } else if (data === 'action_stop') {
                this.stopTransfers(chatId);
            }

            // انتخاب کیف پول
            if (data.startsWith('toggle_wallet_')) {
                const walletIndex = parseInt(data.replace('toggle_wallet_', ''));
                this.toggleWallet(walletIndex, chatId, messageId);
            }

            // انتخاب همه/هیچکدام کیف پول
            if (data === 'select_all_wallets') {
                this.selectAllWallets(chatId, messageId);
            } else if (data === 'deselect_all_wallets') {
                this.deselectAllWallets(chatId, messageId);
            }

            // انتخاب شبکه
            if (data.startsWith('toggle_network_')) {
                const network = data.replace('toggle_network_', '');
                this.toggleNetwork(network, chatId, messageId);
            }

            // تنظیمات
            if (data.startsWith('setting_')) {
                const setting = data.replace('setting_', '');
                this.showSettingInput(setting, chatId);
            }

            this.bot.answerCallbackQuery(query.id);
        });
    }

    showWalletsMenu(chatId, messageId) {
        const keyboard = {
            inline_keyboard: []
        };

        // دکمه‌های کیف پول - دو تا در هر ردیف
        for (let i = 0; i < this.state.wallets.length; i += 2) {
            const row = [];

            for (let j = i; j < i + 2 && j < this.state.wallets.length; j++) {
                const wallet = this.state.wallets[j];
                const isSelected = this.state.selectedWallets.some(w => w.index === wallet.index);
                const emoji = isSelected ? '✅' : '⚪';

                row.push({
                    text: `${emoji} Wallet #${wallet.index}`,
                    callback_data: `toggle_wallet_${wallet.index}`
                });
            }

            keyboard.inline_keyboard.push(row);
        }

        // دکمه‌های انتخاب/حذف همه
        keyboard.inline_keyboard.push([
            { text: '✅ انتخاب همه', callback_data: 'select_all_wallets' },
            { text: '❌ حذف همه', callback_data: 'deselect_all_wallets' }
        ]);

        // دکمه برگشت
        keyboard.inline_keyboard.push([{
            text: '🔙 برگشت به منو',
            callback_data: 'back_to_menu'
        }]);

        const selectedCount = this.state.selectedWallets.length;
        let message = `
👛 *انتخاب کیف پول‌ها*
━━━━━━━━━━━━━━━━━━━

کیف پول‌های مورد نظر را انتخاب کنید:
📊 تعداد انتخاب شده: ${selectedCount}

`;

        // نمایش آدرس کیف پول‌های انتخاب شده
        if (this.state.selectedWallets.length > 0) {
            message += '\n*کیف پول‌های انتخاب شده:*\n';
            this.state.selectedWallets.forEach(wallet => {
                message += `• Wallet #${wallet.index}: \`${wallet.shortAddress}\`\n`;
            });
        }

        this.bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    toggleWallet(walletIndex, chatId, messageId) {
        const wallet = this.state.wallets.find(w => w.index === walletIndex);
        if (wallet) {
            const existingIndex = this.state.selectedWallets.findIndex(w => w.index === walletIndex);
            
            if (existingIndex === -1) {
                // اضافه کردن کیف پول
                this.state.selectedWallets.push(wallet);
                this.bot.sendMessage(chatId, `✅ Wallet #${walletIndex} اضافه شد!`);
            } else {
                // حذف کیف پول
                this.state.selectedWallets.splice(existingIndex, 1);
                this.bot.sendMessage(chatId, `❌ Wallet #${walletIndex} حذف شد!`);
            }
            
            this.showWalletsMenu(chatId, messageId);
        }
    }

    selectAllWallets(chatId, messageId) {
        this.state.selectedWallets = [...this.state.wallets];
        this.bot.sendMessage(chatId, '✅ همه کیف پول‌ها انتخاب شدند!');
        this.showWalletsMenu(chatId, messageId);
    }

    deselectAllWallets(chatId, messageId) {
        this.state.selectedWallets = [];
        this.bot.sendMessage(chatId, '❌ همه کیف پول‌ها حذف شدند!');
        this.showWalletsMenu(chatId, messageId);
    }

    showNetworksMenu(chatId, messageId) {
        const keyboard = {
            inline_keyboard: []
        };

        // دکمه‌های شبکه - دو تا در هر ردیف
        const networkKeys = Object.keys(NETWORKS);
        for (let i = 0; i < networkKeys.length; i += 2) {
            const row = [];

            for (let j = i; j < i + 2 && j < networkKeys.length; j++) {
                const networkKey = networkKeys[j];
                const network = NETWORKS[networkKey];
                const isSelected = this.state.selectedNetworks.includes(networkKey);
                const emoji = isSelected ? '✅' : '⚪';

                row.push({
                    text: `${emoji} ${network.emoji} ${network.name}`,
                    callback_data: `toggle_network_${networkKey}`
                });
            }

            keyboard.inline_keyboard.push(row);
        }

        // دکمه‌های انتخاب/حذف همه
        keyboard.inline_keyboard.push([
            { text: '✅ انتخاب همه', callback_data: 'toggle_network_ALL' },
            { text: '❌ حذف همه', callback_data: 'toggle_network_NONE' }
        ]);

        // دکمه برگشت
        keyboard.inline_keyboard.push([{
            text: '🔙 برگشت به منو',
            callback_data: 'back_to_menu'
        }]);

        const selectedCount = this.state.selectedNetworks.length;
        const message = `
🌐 *انتخاب شبکه‌ها*
━━━━━━━━━━━━━━━━━━━

شبکه‌های مورد نظر را انتخاب کنید:
📊 تعداد انتخاب شده: ${selectedCount}
        `;

        this.bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    toggleNetwork(network, chatId, messageId) {
        if (network === 'ALL') {
            this.state.selectedNetworks = Object.keys(NETWORKS);
            this.bot.sendMessage(chatId, '✅ همه شبکه‌ها انتخاب شدند!');
        } else if (network === 'NONE') {
            this.state.selectedNetworks = [];
            this.bot.sendMessage(chatId, '❌ همه شبکه‌ها حذف شدند!');
        } else {
            const index = this.state.selectedNetworks.indexOf(network);
            if (index === -1) {
                this.state.selectedNetworks.push(network);
                this.bot.sendMessage(chatId, `✅ ${NETWORKS[network].name} اضافه شد!`);
            } else {
                this.state.selectedNetworks.splice(index, 1);
                this.bot.sendMessage(chatId, `❌ ${NETWORKS[network].name} حذف شد!`);
            }
        }

        this.showNetworksMenu(chatId, messageId);
    }

    showSettingsMenu(chatId, messageId) {
        const s = this.state.settings;

        const keyboard = {
            inline_keyboard: [
                [{
                    text: `📊 تعداد تراکنش: ${s.transactionCount}`,
                    callback_data: 'setting_txcount'
                }],
                [{
                    text: `💰 مقدار: ${s.minAmount} - ${s.maxAmount} ETH`,
                    callback_data: 'setting_amount'
                }],
                [{
                    text: `⏱️ تاخیر: ${s.minDelay} - ${s.maxDelay} ثانیه`,
                    callback_data: 'setting_delay'
                }],
                [{
                    text: `🔄 تعداد تلاش مجدد: ${s.maxRetries}`,
                    callback_data: 'setting_retries'
                }],
                [{
                    text: '🔙 برگشت به منو',
                    callback_data: 'back_to_menu'
                }]
            ]
        };

        const message = `
⚙️ *تنظیمات*
━━━━━━━━━━━━━━━━━━━

برای تغییر هر مورد روی آن کلیک کنید:
        `;

        this.bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    showSettingInput(setting, chatId) {
        let prompt = '';
        let example = '';

        switch (setting) {
            case 'txcount':
                prompt = 'تعداد تراکنش را وارد کنید:';
                example = 'مثال: 100';
                break;
            case 'amount':
                prompt = 'محدوده مقدار را به ETH وارد کنید:';
                example = 'مثال: 0.000000001-0.000000005';
                break;
            case 'delay':
                prompt = 'محدوده تاخیر را به ثانیه وارد کنید:';
                example = 'مثال: 10-25';
                break;
            case 'retries':
                prompt = 'تعداد تلاش مجدد را وارد کنید:';
                example = 'مثال: 3';
                break;
        }

        this.bot.sendMessage(chatId, `${prompt}\n\n${example}`);

        // منتظر پاسخ کاربر
        this.bot.once('message', (msg) => {
            if (msg.chat.id !== chatId) return;

            const value = msg.text;
            let success = false;
            let message = '';

            try {
                switch (setting) {
                    case 'txcount':
                        const count = parseInt(value);
                        if (count > 0 && count <= 1000) {
                            this.state.settings.transactionCount = count;
                            success = true;
                            message = `✅ تعداد تراکنش به ${count} تغییر یافت!`;
                        }
                        break;

                    case 'amount':
                        const [min, max] = value.split('-').map(v => v.trim());
                        if (parseFloat(min) > 0 && parseFloat(max) >= parseFloat(min)) {
                            this.state.settings.minAmount = min;
                            this.state.settings.maxAmount = max;
                            success = true;
                            message = `✅ محدوده مقدار به ${min} - ${max} ETH تغییر یافت!`;
                        }
                        break;

                    case 'delay':
                        const [minD, maxD] = value.split('-').map(v => parseInt(v.trim()));
                        if (minD > 0 && maxD >= minD) {
                            this.state.settings.minDelay = minD;
                            this.state.settings.maxDelay = maxD;
                            success = true;
                            message = `✅ محدوده تاخیر به ${minD} - ${maxD} ثانیه تغییر یافت!`;
                        }
                        break;

                    case 'retries':
                        const retries = parseInt(value);
                        if (retries > 0 && retries <= 10) {
                            this.state.settings.maxRetries = retries;
                            success = true;
                            message = `✅ تعداد تلاش مجدد به ${retries} تغییر یافت!`;
                        }
                        break;
                }

                if (success) {
                    this.bot.sendMessage(chatId, message);
                    this.saveSettings();
                } else {
                    this.bot.sendMessage(chatId, '❌ مقدار وارد شده نامعتبر است!');
                }

            } catch (error) {
                this.bot.sendMessage(chatId, '❌ خطا در پردازش مقدار!');
            }
        });
    }

    saveSettings() {
        // ذخیره تنظیمات در فایل
        fs.writeFileSync('bot-settings.json', JSON.stringify(this.state.settings, null, 2));
    }

    async showStatus(chatId) {
        const status = this.state.isRunning ? '🟢 در حال اجرا' : '🔴 متوقف';
        const wallets = this.state.selectedWallets.length > 0 ?
            `${this.state.selectedWallets.length} کیف پول` : 'انتخاب نشده';
        const networks = this.state.selectedNetworks.length > 0 ?
            this.state.selectedNetworks.map(n => NETWORKS[n].name).join(', ') : 'انتخاب نشده';

        let message = `
📊 *وضعیت کامل بات*
━━━━━━━━━━━━━━━━━━━

🔸 *وضعیت:* ${status}
🔸 *کیف پول‌ها:* ${wallets}
🔸 *شبکه‌ها:* ${networks}
🔸 *تعداد تراکنش:* ${this.state.settings.transactionCount}
🔸 *محدوده مقدار:* ${this.state.settings.minAmount} - ${this.state.settings.maxAmount} ETH
🔸 *محدوده تاخیر:* ${this.state.settings.minDelay} - ${this.state.settings.maxDelay} ثانیه
        `;

        if (this.state.currentJobs && this.state.currentJobs.length > 0) {
            message += `\n📍 *کارهای در حال اجرا:*\n`;
            this.state.currentJobs.forEach(job => {
                message += `• ${job.network} - Wallet #${job.walletIndex}: ${job.completed}/${this.state.settings.transactionCount}\n`;
            });
        }

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async showBalances(chatId) {
        if (this.state.selectedWallets.length === 0) {
            this.bot.sendMessage(chatId, '❌ لطفاً ابتدا کیف پول‌ها را انتخاب کنید!');
            return;
        }

        if (this.state.selectedNetworks.length === 0) {
            this.bot.sendMessage(chatId, '❌ لطفاً ابتدا شبکه‌ها را انتخاب کنید!');
            return;
        }

        this.bot.sendMessage(chatId, '🔍 در حال بررسی موجودی‌ها...');

        await this.initializeProviders();

        let message = `💰 *موجودی کیف پول‌های انتخاب شده*\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n\n`;

        for (const wallet of this.state.selectedWallets) {
            message += `📝 *Wallet #${wallet.index}*\n`;
            message += `🔑 \`${wallet.address}\`\n\n`;

            for (const networkKey of this.state.selectedNetworks) {
                const network = NETWORKS[networkKey];
                const provider = this.state.providers[networkKey];

                if (!provider) {
                    message += `${network.emoji} ${network.name}: ⚠️ خطا در اتصال\n`;
                    continue;
                }

                try {
                    const balance = await provider.getBalance(wallet.address);
                    const formatted = ethers.formatEther(balance);
                    message += `${network.emoji} ${network.name}: ${formatted} ETH\n`;
                } catch (error) {
                    message += `${network.emoji} ${network.name}: ❌ خطا\n`;
                }
            }
            message += '\n';
        }

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    showLastReport(chatId) {
        if (Object.keys(this.state.results).length === 0) {
            this.bot.sendMessage(chatId, '❌ هنوز گزارشی موجود نیست!');
            return;
        }

        let totalSuccess = 0;
        let totalFail = 0;

        // گروه‌بندی نتایج بر اساس کیف پول
        const walletResults = {};

        for (const [key, result] of Object.entries(this.state.results)) {
            const walletIndex = result.walletIndex;
            
            if (!walletResults[walletIndex]) {
                walletResults[walletIndex] = [];
            }

            walletResults[walletIndex].push(result);
            totalSuccess += result.success;
            totalFail += result.fail;
        }

        let message = `📈 *گزارش آخرین اجرا*\n━━━━━━━━━━━━━━━━━━━\n\n`;

        // نمایش نتایج به تفکیک کیف پول
        for (const [walletIndex, results] of Object.entries(walletResults)) {
            message += `📝 *Wallet #${walletIndex}:*\n`;
            
            for (const result of results) {
                message += `${NETWORKS[result.network].emoji} *${NETWORKS[result.network].name}*\n`;
                message += `✅ موفق: ${result.success}\n`;
                message += `❌ ناموفق: ${result.fail}\n`;
                message += `⏱️ زمان: ${result.duration} ثانیه\n\n`;
            }
        }

        message += `━━━━━━━━━━━━━━━━━━━\n`;
        message += `📊 *مجموع:*\n`;
        message += `✅ کل موفق: ${totalSuccess}\n`;
        message += `❌ کل ناموفق: ${totalFail}\n`;

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async initializeProviders() {
        this.state.providers = {};

        for (const networkKey of this.state.selectedNetworks) {
            const network = NETWORKS[networkKey];
            try {
                const provider = network.getProvider();

                if (!network.batchesSupported) {
                    provider.batches = false;
                    provider.batchStallTime = 0;
                }

                await provider.getNetwork();
                this.state.providers[networkKey] = provider;
            } catch (error) {
                console.log(`Error connecting to ${network.name}: ${error.message}`);
            }
        }
    }

    async startTransfers(chatId) {
        // بررسی‌های اولیه
        if (this.state.isRunning) {
            this.bot.sendMessage(chatId, '⚠️ بات در حال اجرا است!');
            return;
        }

        if (this.state.selectedWallets.length === 0) {
            this.bot.sendMessage(chatId, '❌ لطفاً ابتدا کیف پول‌ها را انتخاب کنید!');
            return;
        }

        if (this.state.selectedNetworks.length === 0) {
            this.bot.sendMessage(chatId, '❌ لطفاً ابتدا شبکه‌ها را انتخاب کنید!');
            return;
        }

        this.state.isRunning = true;
        this.state.stopRequested = false;
        this.state.results = {};
        this.state.currentJobs = [];

        this.bot.sendMessage(chatId, `🚀 شروع عملیات انتقال با ${this.state.selectedWallets.length} کیف پول در ${this.state.selectedNetworks.length} شبکه...`);

        // اتصال به شبکه‌ها
        await this.initializeProviders();

        // اجرای انتقال‌ها برای هر ترکیب شبکه و کیف پول
        const promises = [];

        for (const networkKey of this.state.selectedNetworks) {
            if (this.state.stopRequested) break;

            for (const wallet of this.state.selectedWallets) {
                if (this.state.stopRequested) break;

                promises.push(this.processNetworkWallet(networkKey, wallet, chatId));
            }
        }

        // صبر برای اتمام همه عملیات‌ها
        await Promise.allSettled(promises);

        this.state.isRunning = false;
        this.state.currentJobs = [];

        this.bot.sendMessage(chatId, '✅ عملیات انتقال تکمیل شد!');
        this.showLastReport(chatId);

        // ذخیره گزارش در فایل
        this.saveReport();
    }

    async processNetworkWallet(networkKey, wallet, chatId) {
        const network = NETWORKS[networkKey];
        const provider = this.state.providers[networkKey];

        if (!provider) {
            this.bot.sendMessage(chatId, `❌ ${network.emoji} ${network.name} - Wallet #${wallet.index}: خطا در اتصال`);
            return;
        }

        const signer = new ethers.Wallet(wallet.privateKey, provider);
        const startTime = Date.now();

        // اضافه کردن کار فعلی
        const currentJob = {
            network: network.name,
            walletIndex: wallet.index,
            completed: 0,
            success: 0,
            fail: 0
        };
        
        this.state.currentJobs.push(currentJob);

        this.bot.sendMessage(chatId, `\n🔄 شروع ${this.state.settings.transactionCount} تراکنش در ${network.emoji} ${network.name} با Wallet #${wallet.index}...\n`);

        // دریافت nonce اولیه
        let nonce = await provider.getTransactionCount(signer.address, "pending");

        for (let i = 0; i < this.state.settings.transactionCount; i++) {
            if (this.state.stopRequested) {
                this.bot.sendMessage(chatId, `⏹️ ${network.name} - Wallet #${wallet.index} متوقف شد در تراکنش ${i + 1}`);
                break;
            }

            // آدرس تصادفی
            const toAddress = ethers.Wallet.createRandom().address;

            // مقدار تصادفی
            const randomAmount = this.getRandomAmount();

            // تلاش برای ارسال
            let success = false;
            let attempts = 0;

            while (!success && attempts < this.state.settings.maxRetries) {
                attempts++;

                try {
                    const tx = {
                        to: toAddress,
                        value: randomAmount,
                        gasLimit: 21000n,
                        gasPrice: (await provider.getFeeData()).gasPrice,
                        nonce: nonce
                    };

                    const txResponse = await signer.sendTransaction(tx);

                    // پیام موفقیت
                    const amount = ethers.formatEther(randomAmount);
                    this.bot.sendMessage(chatId,
                        `✅ [${network.name}] [Wallet #${wallet.index}] [${i + 1}/${this.state.settings.transactionCount}]\n` +
                        `To: ${toAddress.slice(0, 10)}...\n` +
                        `Amount: ${amount} ETH\n` +
                        `Hash: \`${txResponse.hash.slice(0, 20)}...\``,
                        { parse_mode: 'Markdown' }
                    );

                    nonce++;
                    success = true;
                    currentJob.success++;

                } catch (error) {
                    if (error.message.includes('nonce')) {
                        // به‌روزرسانی nonce
                        nonce = await provider.getTransactionCount(signer.address, "pending");
                    }

                    if (attempts >= this.state.settings.maxRetries) {
                        this.bot.sendMessage(chatId,
                            `❌ [${network.name}] [Wallet #${wallet.index}] [${i + 1}/${this.state.settings.transactionCount}] خطا: ${error.message.slice(0, 50)}...`
                        );
                        currentJob.fail++;
                    }
                }
            }

            currentJob.completed++;

            // تاخیر تصادفی
            const delay = this.getRandomDelay();
            await new Promise(resolve => setTimeout(resolve, delay));

            // نمایش پیشرفت هر 10 تراکنش
            if ((i + 1) % 10 === 0) {
                this.bot.sendMessage(chatId,
                    `📊 [${network.name}] [Wallet #${wallet.index}] پیشرفت: ${i + 1}/${this.state.settings.transactionCount} ` +
                    `(✅ ${currentJob.success} | ❌ ${currentJob.fail})`
                );
            }
        }

        // ذخیره نتایج
        const duration = Math.round((Date.now() - startTime) / 1000);
        const resultKey = `${networkKey}-${wallet.index}`;
        
        this.state.results[resultKey] = {
            network: networkKey,
            walletIndex: wallet.index,
            walletAddress: wallet.address,
            success: currentJob.success,
            fail: currentJob.fail,
            duration: duration
        };

        // حذف از لیست کارهای فعلی
        const jobIndex = this.state.currentJobs.findIndex(
            job => job.network === network.name && job.walletIndex === wallet.index
        );
        if (jobIndex !== -1) {
            this.state.currentJobs.splice(jobIndex, 1);
        }

        // گزارش نهایی برای این ترکیب
        this.bot.sendMessage(chatId,
            `\n✅ ${network.emoji} ${network.name} - Wallet #${wallet.index} تکمیل شد!\n` +
            `📊 موفق: ${currentJob.success} | ناموفق: ${currentJob.fail}\n` +
            `⏱️ زمان: ${duration} ثانیه\n`
        );
    }

    getRandomAmount() {
        const min = parseFloat(this.state.settings.minAmount);
        const max = parseFloat(this.state.settings.maxAmount);
        const random = Math.random() * (max - min) + min;
        return ethers.parseEther(random.toFixed(12));
    }

    getRandomDelay() {
        const min = this.state.settings.minDelay * 1000;
        const max = this.state.settings.maxDelay * 1000;
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    stopTransfers(chatId) {
        if (!this.state.isRunning) {
            this.bot.sendMessage(chatId, '⚠️ بات در حال اجرا نیست!');
            return;
        }

        this.state.stopRequested = true;
        this.bot.sendMessage(chatId, '🛑 درخواست توقف ثبت شد. لطفاً صبر کنید...');
    }

    saveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            results: this.state.results,
            settings: this.state.settings
        };

        const filename = `telegram-bot-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));
        console.log(chalk.green(`Report saved to ${filename}`));
    }

    async retry(fn, operation, maxRetries = this.state.settings.maxRetries) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;

                if (attempt < maxRetries) {
                    await new Promise(resolve =>
                        setTimeout(resolve, this.state.settings.retryDelay * attempt)
                    );
                }
            }
        }

        throw lastError;
    }
}

// راه‌اندازی بات
const bot = new TelegramTransferBot();
console.log(chalk.green('🤖 Telegram bot is running...'));

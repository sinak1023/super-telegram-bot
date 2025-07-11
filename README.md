# Multi-Network Ethereum Transfer Bot 🤖

A powerful Telegram bot for automated ETH transfers across multiple blockchain networks with advanced configuration and monitoring capabilities.

## 🌟 Features

- **Multi-Network Support**: Supports 6 major networks
  - 🟡 Soneium (Chain ID: 1868)
  - 🔴 Optimism (Chain ID: 10)
  - 🔵 Ink (Chain ID: 57073)
  - 🟣 Lisk (Chain ID: 1135)
  - 🔷 Base (Chain ID: 8453)
  - 🟢 UniChain (Chain ID: 130)

- **Multi-Wallet Management**: Support for up to 10 wallets simultaneously
- **Automated Transfers**: Batch processing with customizable parameters
- **Real-time Monitoring**: Live transaction status and progress updates
- **Comprehensive Reports**: Detailed success/failure analytics
- **Flexible Configuration**: Adjustable amount ranges, delays, and retry logic
- **Security**: Admin-only access control

## 📋 Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Telegram Bot Token
- Private keys for Ethereum wallets
- RPC endpoints for supported networks

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/multi-network-transfer-bot.git
cd multi-network-transfer-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
env
# Telegram Bot Configuration
```
BOT_TOKEN=your_telegram_bot_token
ADMIN_CHAT_ID=your_telegram_chat_id
```

# Wallet Private Keys
```
PRIVATE_KEY=your_main_wallet_private_key
PRIVATE_KEY_1=optional_wallet_1_private_key
PRIVATE_KEY_2=optional_wallet_2_private_key
# ... up to PRIVATE_KEY_10
```

# RPC Endpoints (optional - defaults provided)
```
SONEIUM_RPC=https://your-soneium-rpc
OP_RPC=https://your-optimism-rpc
INK_RPC=https://your-ink-rpc
LISK_RPC=https://your-lisk-rpc
BASE_RPC=https://your-base-rpc
UNICHAIN_RPC=https://your-unichain-rpc
```

## 🎮 Usage

1. Start the bot:
```bash
node bot.js
```
2. Open Telegram and start a conversation with your bot
3. Use `/start` to open the main menu
4. Configure your settings:
   - Select wallet(s)
   - Choose network(s)
   - Configure transfer parameters
5. Click "🚀 Start" to begin automated transfers

## 📱 Bot Commands

- `/start` - Initialize bot and show main menu
- `/menu` - Return to main menu

## ⚙️ Configuration Options

### Transfer Settings
- **Transaction Count**: Number of transfers per network (1-1000)
- **Amount Range**: Min/max ETH amount per transfer
- **Delay Range**: Min/max delay between transfers (seconds)
- **Max Retries**: Number of retry attempts for failed transactions

### Menu Options
- 👛 **Select Wallet**: Choose active wallet
- 🌐 **Select Networks**: Toggle networks on/off
- ⚙️ **Settings**: Configure transfer parameters
- 📊 **Status**: View current bot status
- 💰 **Balances**: Check wallet balances across networks
- 📈 **Report**: View last execution report

## 🏗️ Project Structure


multi-network-transfer-bot/
├── bot.js              # Main bot application
├── .env.example        # Environment variables template
├── package.json        # Project dependencies
├── README.md          # Documentation
└── bot-settings.json  # Persistent settings storage

## 🔧 Technical Details

### Dependencies
- `ethers` - Ethereum library for blockchain interactions
- `node-telegram-bot-api` - Telegram bot framework
- `dotenv` - Environment variable management
- `chalk` - Terminal string styling

### Network Configuration
Each network includes:
- Chain ID for network identification
- Emoji for visual representation
- RPC provider configuration
- Batch support flag

### Error Handling
- Automatic retry logic for failed transactions
- Nonce management for transaction sequencing
- Network connection validation
- Graceful error reporting

## 🔒 Security Considerations

- **Private Keys**: Never commit private keys to version control
- **Admin Access**: Restrict bot usage to admin chat ID only
- **RPC Endpoints**: Use private/paid RPC services for production
- **Rate Limiting**: Implement delays to avoid network spam

## 📊 Monitoring

The bot provides real-time updates including:
- Transaction success/failure status
- Progress indicators every 10 transactions
- Network-specific summaries
- Total execution time
- Comprehensive final reports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This bot is for educational purposes only. Users are responsible for:
- Gas fees incurred during transfers
- Compliance with local regulations
- Security of their private keys
- Network selection and RPC reliability

## 🐛 Known Issues

- Some networks may have intermittent RPC connectivity
- High gas prices may cause transaction failures
- Rate limiting on public RPC endpoints

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Contact via Telegram: @ostadkachal

---

Made with ❤️ by [OstadKachal](https://github.com/sinak1023)



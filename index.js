const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ---------- Configuration ----------
const TELEGRAM_TOKEN = '8769883888:AAH1Yz_uauMCfpWf64K0vfRiXDhYP7zu8Go'; // Your bot token
const API_KEY = 'ft-key-lt-5lo4p9s28awe'; // Your API key
const API_URL = 'https://ft-osint.onrender.com/api/number';
const DEVELOPER = '@ftgamer2';
const PORT = process.env.PORT || 8080;

// ---------- Telegram Bot Setup ----------
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Handle any text message (phone number)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Ignore commands (like /start)
  if (text?.startsWith('/')) return;

  // Clean the number: keep only digits, remove leading '+'
  const cleaned = text.replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (!cleaned) {
    return bot.sendMessage(chatId, 'Please send a valid phone number.');
  }

  try {
    const params = { key: API_KEY, num: cleaned };
    const response = await axios.get(API_URL, { params, timeout: 10000 });
    const data = response.data;

    if (data.success && data.results && data.results.length > 0) {
      const r = data.results[0];
      const reply = 
`📞 *Number Information*

📱 Number: \`${r.mobile || 'N/A'}\`
👤 Name: ${r.name || 'N/A'}
👨 Father: ${r.father_name || 'N/A'}
🏠 Address: ${r.address || 'N/A'}
📡 Circle/SIM: ${r['circle/sim'] || 'N/A'}
📲 Alt Number: \`${r.alternative_mobile || 'N/A'}\`
📧 Email: ${r.email || 'N/A'}
🪪 Aadhaar: \`${r.aadhar_number || 'N/A'}\`
🔎 Truecaller: ${data.truecaller_name || 'N/A'}

🥷🏿 ${DEVELOPER}`;
      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, `❌ No information found for this number.\n\n🥷🏿 ${DEVELOPER}`);
    }
  } catch (error) {
    console.error('API call failed:', error.message);
    await bot.sendMessage(chatId, `⚠️ An error occurred: ${error.message}\n\n🥷🏿 ${DEVELOPER}`);
  }
});

console.log('🤖 Bot is polling...');

// ---------- Express server for Render health checks ----------
const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ---------- Configuration ----------
const TELEGRAM_TOKEN = '8769883888:AAH1Yz_uauMCfpWf64K0vfRiXDhYP7zu8Go';
const API_KEY = 'ft-key-lt-5lo4p9s28awe';
const API_URL = 'https://ft-osint.onrender.com/api/number';
const DEVELOPER = '@fucpd';
const CHANNEL_USERNAME = '@xtradegc'; // 🔁 REPLACE WITH YOUR CHANNEL
const PORT = process.env.PORT || 8080;

// ---------- In-memory store for verified users ----------
const verifiedUsers = new Set();

// ---------- Telegram Bot Setup ----------
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ---------- Helper: Check channel membership ----------
async function isUserMember(chatId, userId) {
  try {
    const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
    // Status can be 'creator', 'administrator', 'member', 'restricted', 'left', 'kicked'
    return ['creator', 'administrator', 'member', 'restricted'].includes(chatMember.status);
  } catch (error) {
    console.error('Error checking membership:', error.message);
    return false; // If error (bot not admin, etc.), treat as not member
  }
}

// ---------- Command: /start ----------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Only work in private chats
  if (msg.chat.type !== 'private') return;
  
  // Check if already verified
  if (verifiedUsers.has(userId)) {
    return bot.sendMessage(chatId, '✅ You are already verified! Send me a phone number to get info.');
  }

  // ---------- Helper: Check channel membership with logging ----------
async function isUserMember(chatId, userId) {
  try {
    const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
    const status = chatMember.status;
    console.log(`Membership check for user ${userId}: status = ${status}`);
    return ['creator', 'administrator', 'member', 'restricted'].includes(status);
  } catch (error) {
    console.error('Error in isUserMember:', error.response?.body || error.message);
    // If the bot is not in the channel, error message will indicate that
    return false;
  }
}

  // Not a member: show join button and verify button
  const inlineKeyboard = {
    inline_keyboard: [
      [{ text: '📢 Join Channel', url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` }],
      [{ text: "✅ I've Joined", callback_data: 'verify_join' }]
    ]
  };
  await bot.sendMessage(
    chatId,
    '⚠️ You must join my channel to use this bot.\n\nClick the button below to join, then click "I\'ve Joined".',
    { reply_markup: inlineKeyboard }
  );
});

// ---------- Callback Query: "I've Joined" ----------
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  // Ignore if not private
  if (msg.chat.type !== 'private') return;
  
  if (data === 'verify_join') {
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Checking membership...' });

    const isMember = await isUserMember(chatId, userId);
    if (isMember) {
      verifiedUsers.add(userId);
      await bot.sendMessage(chatId, '✅ Verification successful! Now send me a phone number.');
      // Optionally delete the previous message with buttons
      await bot.deleteMessage(chatId, msg.message_id);
    } else {
      await bot.sendMessage(chatId, '❌ You have not joined the channel yet. Please join first.');
    }
  }
});

// ---------- Handle phone numbers (only if verified) ----------
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text?.trim();
  
  // Ignore commands (handled separately)
  if (text?.startsWith('/')) return;

  // Ignore commands
  if (text?.startsWith('/')) return;
  
  // Check verification
  if (!verifiedUsers.has(userId)) {
    return bot.sendMessage(
      chatId,
      '⚠️ You need to verify first. Please type /start to begin.'
    );
  }

  // Clean the number: keep only digits, remove leading '+'
  const cleaned = text.replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (!cleaned) {
    return bot.sendMessage(chatId, 'Please send a valid phone number.');
  }
    // ---------- Send loading message ----------
  const loadingMsg = await bot.sendMessage(chatId, '⏳ Fetching information, please wait...');
  
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

      // Add "Check Another Number" button
      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 Check Another Number', callback_data: 'another_number' }]
        ]
      };
      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown', reply_markup: keyboard });
    } else {
      await bot.sendMessage(chatId, `❌ No information found for this number.\n\n🥷🏿 ${DEVELOPER}`);
    }
  } catch (error) {
    console.error('API call failed:', error.message);
    await bot.sendMessage(chatId, `⚠️ An error occurred: ${error.message}\n\n🥷🏿 ${DEVELOPER}`);
  }
});

// ---------- Callback: "Check Another Number" ----------
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;

    // Ignore if not private
  if (msg.chat.type !== 'private') return;

  if (data === 'another_number') {
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.sendMessage(chatId, '📲 Please send another phone number:');
    // Optionally delete the previous result message
    await bot.deleteMessage(chatId, msg.message_id);
  }
});

console.log('🤖 Bot is polling...');

// ---------- Express server for Render health checks ----------
const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));

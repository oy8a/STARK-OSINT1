const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ---------- Configuration ----------
const TELEGRAM_TOKEN = '8769883888:AAH1Yz_uauMCfpWf64K0vfRiXDhYP7zu8Go';
const API_KEY = 'ft-key-lt-5lo4p9s28awe';
const API_URL = 'https://ft-osint.onrender.com/api/number';
const DEVELOPER = 'made by ~ @fucpd';
const CHANNEL_USERNAME = '@tieamx';
const PORT = process.env.PORT || 8080;

// ---------- Global Error Handlers ----------
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

// ---------- Verified Users Store ----------
const verifiedUsers = new Set();

// ---------- Telegram Bot ----------
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

// ---------- Helper: Check Channel Membership ----------
async function isUserMember(userId) {
  try {
    const member = await bot.getChatMember(CHANNEL_USERNAME, userId);
    return ['creator','administrator','member','restricted'].includes(member.status);
  } catch (err) {
    console.error('Membership check error:', err.message);
    return false;
  }
}

// ---------- /start ----------
bot.onText(/\/start/, async (msg) => {

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (verifiedUsers.has(userId)) {
    return bot.sendMessage(chatId,'✅ Already verified. Send a phone number.');
  }

  const member = await isUserMember(userId);

  if (member) {
    verifiedUsers.add(userId);
    return bot.sendMessage(chatId,'✅ Verified successfully. Send phone number.');
  }

  const keyboard = {
    inline_keyboard: [
      [{ text:'📢 Join Channel', url:`https://t.me/${CHANNEL_USERNAME.replace('@','')}` }],
      [{ text:"✅ I've Joined", callback_data:'verify_join' }]
    ]
  };

  bot.sendMessage(
    chatId,
    '⚠️ Join the channel first then click "I\'ve Joined".',
    { reply_markup: keyboard }
  );

});

// ---------- Callback Queries ----------
bot.on('callback_query', async (query) => {

  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  if (data === 'verify_join') {

    await bot.answerCallbackQuery(query.id);

    const member = await isUserMember(userId);

    if (member) {
      verifiedUsers.add(userId);
      await bot.sendMessage(chatId,'✅ Verification successful. Send phone number.');
      await bot.deleteMessage(chatId, query.message.message_id);
    } else {
      await bot.sendMessage(chatId,'❌ You have not joined the channel.');
    }
  }

  if (data === 'another_number') {

    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId,'📲 Send another phone number.');
    await bot.deleteMessage(chatId, query.message.message_id);
  }

});

// ---------- Handle Messages ----------
bot.on('message', async (msg) => {

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text?.trim();

  if (!text || text.startsWith('/')) return;

  if (!verifiedUsers.has(userId)) {
    return bot.sendMessage(chatId,'⚠️ Type /start to verify first.');
  }

  const cleaned = text.replace(/[^\d]/g,'');

  if (!cleaned) {
    return bot.sendMessage(chatId,'Please send a valid phone number.');
  }

  const loadingMsg = await bot.sendMessage(chatId,'⏳ Fetching information...');

  try {

    const response = await axios.get(API_URL,{
      params:{ key:API_KEY, num:cleaned },
      timeout:10000
    });

    const data = response.data;

    let reply;
    let keyboard = null;

    if (data.success && data.results && data.results.length > 0) {

      const r = data.results[0];

      reply =
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

      keyboard = {
        inline_keyboard:[
          [{ text:'🔄 Check Another Number', callback_data:'another_number' }]
        ]
      };

    } else {

      reply = `❌ No information found.\n\n🥷🏿 ${DEVELOPER}`;

    }

    await bot.editMessageText(reply,{
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode:'Markdown',
      reply_markup: keyboard
    });

  } catch (err) {

    console.error('API error:', err.message);

    await bot.editMessageText(
      `⚠️ API Error: ${err.message}`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      }
    );

  }

});

console.log('🤖 Bot running...');

// ---------- Express Server (Render Health Check) ----------
const app = express();

app.get('/', (req,res)=>{
  res.send('Bot running');
});

app.listen(PORT, ()=>{
  console.log(`Server running on port ${PORT}`);
});

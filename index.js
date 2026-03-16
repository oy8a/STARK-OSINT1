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
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

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
    const status = member.status;
    return ['creator', 'administrator', 'member', 'restricted'].includes(status);
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
    return bot.sendMessage(chatId, '✅ Already verified. Send a phone number.');
  }

  const member = await isUserMember(userId);

  if (member) {
    verifiedUsers.add(userId);
    return bot.sendMessage(chatId, '✅ Verified successfully. Send phone number.');
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: '📢 Join Channel', url: `https://t.me/${CHANNEL_USERNAME.replace('@','')}` }],
      [{ text: "✅ I've Joined", callback_data: 'verify_join' }]
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
      await bot.sendMessage(chatId, '✅ Verification successful. Send number.');
      await bot.deleteMessage(chatId, query.message.message_id);
    } 
    else {
      bot.sendMessage(chatId, '❌ You still have not joined the channel.');
    }

  }

  if (data === 'another_number') {

    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, '📲 Send another phone number.');
    await bot.deleteMessage(chatId, query.message.message_id);

  }

});

// ---------- Handle Numbers ----------
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
    return bot.sendMessage(chatId,'Send a valid phone number.');
  }

  const loading = await bot.sendMessage(chatId,'⏳ Fetching information...');

  try {

    const response = await axios.get(API_URL,{
      params:{ key: API_KEY, num: cleaned },
      timeout:10000
    });

    const data = response.data;

    let reply;
    let keyboard = null;

    if (data.success && data.results?.length > 0) {

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
          [{ text:'🔄 Check Another Number', callback_data:'another_number'}]
        ]
      };

    }
    else {
      reply = `❌ No information found.\n\n🥷🏿 ${DEVELOPER}`;
    }

    await bot.editMessageText(reply,{
      chat_id: chatId,
      message_id: loading.message_id,
      parse_mode:'Markdown',
      reply_markup: keyboard
    });

  } 
  catch (err) {

    console.error('API error:',err.message);

    await bot.editMessageText(
      `⚠️ API Error: ${err.message}`,
      {
        chat_id: chatId,
        message_id: loading.message_id
      }
    );

  }

});

console.log('🤖 Bot running...');

// ---------- Express Server ----------
const app = express();

app.get('/', (req,res)=>{
  res.send('Bot running');
});

app.listen(PORT, ()=>{
  console.log(`🌐 Server running on ${PORT}`);
});

// ---------- Helper: Check channel membership ----------
async function isUserMember(chatId, userId) {
  try {
    const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
    return ['creator', 'administrator', 'member', 'restricted'].includes(chatMember.status);
  } catch (error) {
    console.error('Error checking membership:', error.response?.body || error.message);
    return false;
  }
}

// ---------- Command: /start ----------
bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // 👇 PRIVATE CHAT RESTRICTION REMOVED – now works everywhere
    if (verifiedUsers.has(userId)) {
      return bot.sendMessage(chatId, '✅ You are already verified! Send me a phone number to get info.');
    }

    const isMember = await isUserMember(chatId, userId);
    if (isMember) {
      verifiedUsers.add(userId);
      return bot.sendMessage(chatId, '✅ You are a member! Send me a phone number to get info.');
    }

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
  } catch (error) {
    console.error('Error in /start handler:', error);
  }
});

// ---------- Callback Query: "I've Joined" & "Check Another Number" ----------
bot.on('callback_query', async (callbackQuery) => {
  try {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    // 👇 PRIVATE CHAT RESTRICTION REMOVED
    if (data === 'verify_join') {
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Checking membership...' });

      const isMember = await isUserMember(chatId, userId);
      if (isMember) {
        verifiedUsers.add(userId);
        await bot.sendMessage(chatId, '✅ Verification successful! Now send me a phone number.');
        await bot.deleteMessage(chatId, msg.message_id);
      } else {
        await bot.sendMessage(chatId, '❌ You have not joined the channel yet. Please join first.');
      }
    } else if (data === 'another_number') {
      await bot.answerCallbackQuery(callbackQuery.id);
      await bot.sendMessage(chatId, '📲 Please send another phone number:');
      await bot.deleteMessage(chatId, msg.message_id);
    }
  } catch (error) {
    console.error('Error in callback query handler:', error);
  }
});

// ---------- Handle phone numbers (only if verified) ----------
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text?.trim();

    // 👇 PRIVATE CHAT RESTRICTION REMOVED – responds everywhere
    if (text?.startsWith('/')) return; // ignore commands (handled separately)

    if (!verifiedUsers.has(userId)) {
      return bot.sendMessage(
        chatId,
        '⚠️ You need to verify first. Please type /start to begin.'
      );
    }

    const cleaned = text.replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (!cleaned) {
      return bot.sendMessage(chatId, 'Please send a valid phone number.');
    }

    // Send loading message
    const loadingMsg = await bot.sendMessage(chatId, '⏳ Fetching information, please wait...');

    try {
      const params = { key: API_KEY, num: cleaned };
      const response = await axios.get(API_URL, { params, timeout: 10000 });
      const data = response.data;

      let finalReply = '';
      let keyboard = null;

      if (data.success && data.results && data.results.length > 0) {
        const r = data.results[0];
        finalReply = 
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
          inline_keyboard: [
            [{ text: '🔄 Check Another Number', callback_data: 'another_number' }]
          ]
        };
      } else {
        finalReply = `❌ No information found for this number.\n\n🥷🏿 ${DEVELOPER}`;
      }

      await bot.editMessageText(finalReply, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('API call failed:', error.message);
      await bot.editMessageText(`⚠️ An error occurred: ${error.message}\n\n🥷🏿 ${DEVELOPER}`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error('Error in message handler:', error);
  }
});

console.log('🤖 Bot is polling...');

// ---------- Express server for Render health checks ----------
const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));  if (verifiedUsers.has(userId)) {
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
bot.on('message', async (msg) => { // ✅ Added 'async'
  await bot.sendMessage(...)
});
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

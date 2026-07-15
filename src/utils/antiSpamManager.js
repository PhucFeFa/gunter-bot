const { setBotDebt } = require('./economyDB');
const { getConfig } = require('./configDB');

const userMessages = new Map(); // userId -> { count, firstMessageTime }
const SPAM_LIMIT = 6; // 6 tin nhắn
const SPAM_TIME = 3000; // trong 3 giây
const MAX_MSG_LENGTH = 1500; // Giới hạn 1500 ký tự / tin nhắn
const MAX_NEWLINES = 20; // Giới hạn 20 dòng / tin nhắn

async function handleMessage(message) {
    if (!message.guild || message.author.bot) return false;

    const config = await getConfig(message.guild.id);
    const antispamChannels = config.antispam_channels || [];

    if (!antispamChannels.includes(message.channel.id)) return false;

    // Admin bypass
    if (message.member.permissions.has('Administrator')) return false;

    const userId = message.author.id;
    const now = Date.now();

    // Kiểm tra tin nhắn cực dài hoặc quá nhiều dòng (Spam wall of text)
    const isLongSpam = message.content.length > MAX_MSG_LENGTH || (message.content.match(/\n/g) || []).length > MAX_NEWLINES;

    if (!userMessages.has(userId)) {
        userMessages.set(userId, { count: isLongSpam ? SPAM_LIMIT : 1, firstMessageTime: now });
        if (!isLongSpam) return false;
    }

    const userData = userMessages.get(userId);

    if (now - userData.firstMessageTime > SPAM_TIME) {
        // Reset if time window passed
        userData.count = isLongSpam ? SPAM_LIMIT : 1;
        userData.firstMessageTime = now;
        if (!isLongSpam) return false;
    } else {
        if (isLongSpam) userData.count = SPAM_LIMIT;
        else userData.count++;
    }

    if (userData.count >= SPAM_LIMIT) {
        // Trigger punishment
        try {
            // Delete the trigger message if possible
            if (message.deletable) await message.delete().catch(() => { });

            // 1. Timeout for 10 minutes
            await message.member.timeout(10 * 60 * 1000, 'Spam kênh chống spam bị Gunter bắt').catch(() => { });

            // 2. 1 Billion Bot Debt
            await setBotDebt(userId, 1000000000);

            // 2.5 Lưu tên của nó lại để sau này đòi nợ gọi đúng tên
            const { updateUsername } = require('./economyDB');
            updateUsername(userId, message.author.username);

            // 3. Swear at them
            await message.channel.send(`🚨 <@${userId}> **MÀY BỊ BỐ MÀY BẮT RỒI NHÉ CON CHÓ SPAM!** 🚨\nTao đã tống mày vào tù (mute) 10 phút để mày ngậm cái mồm lại, đồng thời giã vào đầu mày **1,000,000,000 🪙** tiền nợ cho chừa thói láo toét! Cút! 🐧💀`);

        } catch (error) {
            console.error('[ANTISPAM] Lỗi khi trừng phạt:', error);
            await message.channel.send(`🚨 <@${userId}> Spam cc à? Tao tính khóa mõm mày nhưng Discord đéo cho. Nhớ mặt tao đấy, nợ 1 tỷ 🪙! 🐧`);
            await setBotDebt(userId, 1000000000);
        }

        // Reset count so we don't trigger repeatedly in the same window
        userMessages.delete(userId);
        return true; // Indicates handled
    }

    return false;
}

// Cleanup interval to avoid memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of userMessages.entries()) {
        if (now - data.firstMessageTime > SPAM_TIME) {
            userMessages.delete(userId);
        }
    }
}, 60000); // Check every minute

module.exports = { handleMessage };

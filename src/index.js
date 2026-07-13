/**
 * ============================================================
 * GUNTER BOT - Main Entry Point
 * ============================================================
 * Loads environment variables, initializes Firebase,
 * registers all event handlers, and logs the bot in.
 * ============================================================
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, Options } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startServer } = require('./server');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { borrowerMsgs, referrerMsgs } = require('./data/loanMessages');

// --- Validate required environment variables on startup ---
const REQUIRED_ENV = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`[FATAL] Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.error(`[FATAL] Missing required environment variable: FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON`);
    process.exit(1);
}

// --- Initialize Firebase Admin SDK ---
require('./utils/firebase'); // Triggers the singleton init

// --- Create Discord Client ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        MessageManager: { maxSize: 25 },
        PresenceManager: 0,
        ReactionManager: 0,
        ReactionUserManager: 0,
        ThreadManager: 0,
        GuildEmojiManager: 0,
        GuildStickerManager: 0,
        GuildInviteManager: 0,
        GuildScheduledEventManager: 0,
        StageInstanceManager: 0,
        BaseGuildEmojiManager: 0,
    }),
});

// --- Initialize Music Player ---
const player = new Player(client);
player.extractors.loadMulti(DefaultExtractors).then(() => {
    console.log('[MUSIC] Các công cụ giải mã âm thanh đã được tải thành công!');
});

// Bắt lỗi âm thanh để bot không bị sập
player.events.on('error', (queue, error) => {
    console.error(`[MUSIC ERROR] Lỗi trong hàng đợi: ${error.message}`);
});
player.events.on('playerError', (queue, error) => {
    console.error(`[MUSIC ERROR] Lỗi hệ thống phát: ${error.message}`);
});

// --- Attach a commands Collection to the client ---
client.commands = new Collection();
client.snipes = new Collection(); // Khởi tạo bộ nhớ tạm để lưu tin nhắn bị xóa cho lệnh /snipe 

// --- Load Commands ---
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`[CMD] Loaded: /${command.data.name}`);
        } else if ('name' in command && 'executePrefix' in command) {
            // Prefix-only command (no slash)
            client.commands.set(command.name, command);
            console.log(`[CMD] Loaded prefix: ${command.name}`);
        } else {
            console.warn(`[WARN] Command at ${file} is missing "data" or "execute".`);
        }
    }
}

// --- Load Events ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[EVT] Loaded: ${event.name}`);
}

// --- Anti-Crash System ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('[ANTI-CRASH] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error('[ANTI-CRASH] Uncaught Exception:', err, 'origin:', origin);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.error('[ANTI-CRASH] Uncaught Exception Monitor:', err, 'origin:', origin);
});

// --- Login ---
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('[BOT] Login successful!');
        // Bật Web API để Render.com có thể nhận diện cổng (Port) và không bị báo lỗi.
        // Đây cũng là cổng để UptimeRobot ping giữ bot thức 24/7.
        startServer(client);

        // --- Fish Shop Reset Scheduler ---
        const { startFishShopScheduler } = require('./utils/fishShopReset');
        startFishShopScheduler(client);

        // --- Cron Job Đòi Nợ ---
        const { getAllDebtors, updateLoanDetails } = require('./utils/economyDB');
        const { getRod } = require('./utils/fishDB');
        const { setUserRod } = require('./utils/fishDB');
        
        setInterval(async () => {
            try {
                const debtors = await getAllDebtors();
                if (debtors.length === 0) return;
                
                const channel = client.channels.cache.get('1525454150803128371');
                
                // Bỏ mảng tĩnh, sử dụng data từ loanMessages.js

                for (const user of debtors) {
                    let discordUser = null;
                    let userName = user.username || "Kẻ Ẩn Danh";
                    try {
                        discordUser = await client.users.fetch(user.userId);
                        userName = discordUser.username;
                        // Lưu tên mới nhất vào DB phòng khi sau này họ thoát server
                        require('./utils/economyDB').updateUsername(user.userId, userName);
                    } catch (e) {}

                    const randomMsg = borrowerMsgs[Math.floor(Math.random() * borrowerMsgs.length)]
                        .replace(/{user}/g, userName.toUpperCase())
                        .replace(/{debt}/g, user.loanAmount.toLocaleString())
                        .replace(/{borrowed}/g, user.loanAmount.toLocaleString());
                    
                    let refMentions = '';
                    if (user.loanRefs && user.loanRefs.length > 0) {
                        refMentions = ` (Liên đới: ${user.loanRefs.map(id => `<@${id}>`).join(' ')})`;
                    }
                    
                    let seizeText = '';
                    if (!user.seizedRod) {
                        // Thử siết cần câu nếu chưa siết
                        try {
                            const { getJobData } = require('./utils/economyDB');
                            const { rod } = await getRod(user.userId);
                            if (rod > 1) { // Chỉ siết nếu cần > 1 (khác cần tre)
                                const seizedRequire = Math.floor(Math.random() * (user.loanAmount * 0.5)) + Math.floor(user.loanAmount * 0.1);
                                await updateLoanDetails(user.userId, undefined, rod, seizedRequire);
                                await setUserRod(user.userId, 1, 15); // Hạ xuống cần tre
                                seizeText = `\n\n🎣 **LỆNH SIẾT TÀI SẢN**: Giang hồ đã tịch thu cần câu của mày làm tài sản thế chấp. Phải trả ít nhất **${seizedRequire.toLocaleString()} 🪙** để chuộc lại!`;
                            }
                        } catch(e) {
                            console.error('Lỗi khi siết cần câu:', e);
                        }
                    }

                    if (channel) {
                        const text = `⚠️ **ĐÒI NỢ THUÊ**\nÊ <@${user.userId}>${refMentions}, thằng ${userName} đang nợ ngân hàng Gunter **${user.loanAmount.toLocaleString()} 🪙**.\n(Dùng lệnh \`/loan repay\` hoặc \`/work\` để trừ nợ ngay!)${seizeText}`;
                        await channel.send(text);
                    }
                    
                    // DM Borrower
                    if (discordUser) {
                        try {
                            await discordUser.send(`🔪 **GIANG HỒ ĐÒI NỢ:**\n\n${randomMsg}${seizeText}`);
                        } catch(e) {}
                    }

                    // DM References
                    if (user.loanRefs) {
                        for (const refId of user.loanRefs) {
                            try {
                                const refUser = await client.users.fetch(refId);
                                if (refUser) {
                                    const rMsg = referrerMsgs[Math.floor(Math.random() * referrerMsgs.length)]
                                        .replace(/{user}/g, userName)
                                        .replace(/{debt}/g, user.loanAmount.toLocaleString())
                                        .replace(/{borrowed}/g, user.loanAmount.toLocaleString());
                                    await refUser.send(`🔪 **GIANG HỒ LIÊN ĐỚI:**\n\n${rMsg}`);
                                }
                            } catch(e) {}
                        }
                    }
                }
            } catch (err) {
                console.error("Cron Đòi nợ lỗi:", err);
            }
        }, 1 * 60 * 60 * 1000); // 1 hour

    })
    .catch(err => {
        console.error('[FATAL] Failed to login:', err.message);
        process.exit(1);
    });

// --- Xử lý khi bot sập / khởi động lại (Hoàn tiền người chơi) ---
async function gracefulShutdown(signal) {
    console.log(`\n[SYSTEM] Nhận tín hiệu ${signal}. Bắt đầu tắt an toàn...`);
    try {
        const liveGameManager = require('./utils/liveGameManager');
        await liveGameManager.shutdown();
    } catch (e) {
        console.error('[SYSTEM] Lỗi khi hoàn tiền:', e);
    }
    process.exit(0);
}

// Chỉ shutdown khi nhận tín hiệu tắt hệ thống thật sự (Ctrl+C hoặc pm2 stop)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// KHÔNG BAO GIỜ gọi process.exit() trong đây - chỉ log lỗi rồi tiếp tục
process.on('uncaughtException', (err) => {
    console.error('[ERROR] Uncaught Exception (bot tiếp tục chạy):', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[ERROR] Unhandled Rejection (bot tiếp tục chạy):', reason?.message || reason);
});


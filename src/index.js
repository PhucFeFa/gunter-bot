/**
 * ============================================================
 * GUNTER BOT - Main Entry Point
 * ============================================================
 * Loads environment variables, initializes Firebase,
 * registers all event handlers, and logs the bot in.
 * ============================================================
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startServer } = require('./server');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

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
        const { getAllDebtors } = require('./utils/economyDB');
        setInterval(async () => {
            try {
                const debtors = await getAllDebtors();
                if (debtors.length === 0) return;
                
                const channel = client.channels.cache.get('1525454150803128371');
                
                const dmMsgs = [
                    "CẢNH BÁO CUỐI CÙNG!!! NHẮN GẤP ĐỐI TƯỢNG {user} RA TRẢ NỢ GẤP SỐ TIỀN {amount} VỚI CÔNG TY TRƯỚC KHI CHÚNG TÔI GỬI THÔNG BÁO NỢ BẰNG HÌNH ẢNH, VIDEO ĐẾN ĐỊA PHƯƠNG, NƠI LÀM VIỆC, BẠN BÈ, NGƯỜI THÂN. ĐỪNG ĐỂ ẢNH HƯỞNG ĐẾN UY TÍN DANH DỰ CỦA MÌNH CŨNG NHƯ CỦA NGƯỜI THÂN ĐÃ CUNG CẤP TRONG HỒ SƠ VAY! DÙNG LỆNH `/loan repay` ĐỂ CƠ CẤU LẠI NỢ GIẢM NỢ NGAY LẬP TỨC!!!",
                    "THÔNG BÁO ĐÒI NỢ KHẨN CẤP!!! YÊU CẦU ĐỐI TƯỢNG {user} THANH TOÁN SỐ TIỀN {amount} ĐANG CÒN NỢ TẠI NGÂN HÀNG GUNTER. NẾU NGOAN CỐ KHÔNG TRẢ, CHÚNG TÔI SẼ TIẾN HÀNH BÔI NHỌ DANH DỰ TRÊN TOÀN BỘ CÁC TRANG MẠNG XÃ HỘI VÀ TREO BĂNG RÔN TRƯỚC CỬA NHÀ MÀY. DÙNG LỆNH `/loan repay` HOẶC CÀY `/work` RA TRẢ TIỀN GẤP!!!",
                    "LỆNH TRUY NÃ CON NỢ!!! Ê {user}, MÀY ĐANG NỢ SỐ TIỀN {amount} MÀ ĐỊNH TRỐN À? CHÚNG TÔI ĐÃ NẮM TOÀN BỘ THÔNG TIN ĐỊA CHỈ, NƠI LÀM VIỆC CỦA MÀY VÀ NGƯỜI THÂN. LIỆU HỒN MÀ GOM TIỀN VÀO LỆNH `/loan repay` THANH TOÁN CHO XONG TRƯỚC KHI ĐÀN EM CỦA TAO XUỐNG TẬN NƠI LÀM VIỆC XỬ LÝ!!!",
                    "THAY MẶT GIANG HỒ, TAO GỬI CẢNH BÁO TỚI {user}! SỐ NỢ {amount} CỦA MÀY ĐÃ QUÁ HẠN. HÃY RA TRẢ NỢ GẤP TRƯỚC KHI CHÚNG TÔI LIÊN HỆ CHO CHA MẸ, ĐỒNG NGHIỆP CỦA MÀY ĐỂ BÁO CÁO VỀ VIỆC MÀY ĂN BÁM LỪA ĐẢO. DÙNG `/loan repay` ĐỂ XỬ LÝ NỢ TRONG HÔM NAY!!!",
                    "CÔNG TY ĐÒI NỢ THUÊ GUNTER THÔNG BÁO: ĐỐI TƯỢNG {user} VUI LÒNG HOÀN TRẢ SỐ TIỀN {amount} ĐÃ BỐC BÁT HỌ. ĐÂY LÀ LỜI CẢNH CÁO CUỐI CÙNG TRƯỚC KHI HÌNH ẢNH CỦA MÀY BỊ PHÁT TÁN LÊN CÁC TRANG PHIM NGƯỜI LỚN VÀ CÁC DIỄN ĐÀN CHỢ ĐEN. DÙNG LỆNH `/loan repay` NGAY ĐỂ BẢO TOÀN DANH DỰ!!!"
                ];

                for (const user of debtors) {
                    let discordUser = null;
                    let userName = "Mày";
                    try {
                        discordUser = await client.users.fetch(user.userId);
                        userName = discordUser.username;
                    } catch (e) {}

                    const randomMsg = dmMsgs[Math.floor(Math.random() * dmMsgs.length)]
                        .replace('{user}', userName.toUpperCase())
                        .replace('{amount}', user.loanAmount.toLocaleString() + ' 🪙');
                    
                    if (channel) {
                        const text = `⚠️ **ĐÒI NỢ THUÊ**\nÊ <@${user.userId}>, mày đang nợ ngân hàng Gunter **${user.loanAmount.toLocaleString()} 🪙**.\n(Dùng lệnh \`/loan repay\` hoặc \`/work\` để trừ nợ ngay!)`;
                        await channel.send(text);
                    }
                    
                    // DM
                    if (discordUser) {
                        try {
                            await discordUser.send(`🔪 **GIANG HỒ ĐÒI NỢ:**\n\n${randomMsg}`);
                        } catch(e) {
                            // Ignore if DM is closed
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

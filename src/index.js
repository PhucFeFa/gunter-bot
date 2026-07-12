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
        const { getAllDebtors, updateLoanDetails } = require('./utils/economyDB');
        const { getRod } = require('./utils/fishDB');
        const { setUserRod } = require('./utils/fishDB');
        
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
                    "CÔNG TY ĐÒI NỢ THUÊ GUNTER THÔNG BÁO: ĐỐI TƯỢNG {user} VUI LÒNG HOÀN TRẢ SỐ TIỀN {amount} ĐÃ BỐC BÁT HỌ. ĐÂY LÀ LỜI CẢNH CÁO CUỐI CÙNG TRƯỚC KHI HÌNH ẢNH CỦA MÀY BỊ PHÁT TÁN LÊN CÁC TRANG PHIM NGƯỜI LỚN VÀ CÁC DIỄN ĐÀN CHỢ ĐEN. DÙNG LỆNH `/loan repay` NGAY ĐỂ BẢO TOÀN DANH DỰ!!!",
                    "THÔNG BÁO TỚI CON NỢ {user}: Khoản nợ {amount} của mày đã bị đưa vào danh sách nợ xấu. Chúng tao đã gửi đơn tố cáo hành vi lạm dụng tín nhiệm chiếm đoạt tài sản. Liệu hồn mà vào gõ `/loan repay` trả nợ nếu không muốn bóc lịch!",
                    "Mày định chơi lầy với anh em Gunter à {user}? Cầm {amount} tiêu xài rửng mỡ mà đéo biết đường trả. Đừng để tao phải lấy tiết mày giữa đêm. Khôn hồn thì cày `/work` trả nợ ngay lập tức, đừng để tao nói nhiều!",
                    "ALO ALO, THẰNG CHÓ {user} NGHE RÕ TRẢ LỜI! Tiền vay {amount} để đó định đẻ lãi ra vàng à? Bọn tao làm ăn đàng hoàng chứ đéo phải quỹ từ thiện. Xì tiền ra qua lệnh `/loan repay` nhanh trước khi sập cửa nhà mày!",
                    "Đây không phải lời đe dọa, đây là TỐI HẬU THƯ cho {user}! Khoản nợ {amount} đã quá giới hạn chịu đựng. Nếu hôm nay đéo thấy mày trả 1 đồng nào, tao sẽ spam tất cả server mày tham gia! Khôn hồn thì trả tiền đi!",
                    "Mặt mũi sáng sủa mà đi bùng nợ {amount} à {user}? Bạn bè mày sẽ nghĩ gì khi thấy hình mày trên web đen với dòng chữ 'BỐC BÁT HỌ KHÔNG TRẢ'? Nhục lắm con ơi, lo mà dùng `/loan repay` cống nạp tiền trả họ đi!"
                ];

                const refMsgs = [
                    "Kính gửi quý khách! Quý khách có một người bạn tuyệt vời tên là {user}. Nó đã bốc bát họ {amount} để ăn chơi trác táng và ghi tên quý khách vào hồ sơ bảo lãnh. Xin vui lòng liên hệ nó và bảo nó trả nợ ngay, nếu không chúng tôi sẽ liên tục nhắn tin làm phiền quý khách mỗi ngày đấy. Khuyên nó cày `/work` đi!",
                    "Thông báo từ hệ thống ngân hàng Gunter: Chúc mừng bạn đã quay vào ô 'Có Thằng Bạn Bá Dơ'. Đối tượng {user} vay chúng tôi {amount} và lấy danh dự của bạn ra để thế chấp. Không biết danh dự bạn có đáng giá từng đó không? Tốt nhất là bạn nên vác loa sang nhà nó mở max volume réo tên nó đi `/loan repay` trả nợ đi nhé!",
                    "Thật không thể tin nổi bạn lại đi chơi chung với loại người như {user}. Nó nợ chúng tôi {amount} và hồn nhiên cắm tên bạn làm người tham chiếu. Dĩ nhiên chúng tôi không đòi tiền bạn, nhưng chúng tôi sẽ dí bạn mỗi giờ mỗi ngày cho đến khi thằng khứa đó trả nợ. Hãy dùng tình bạn diệu kỳ của mình khuyên nó trả tiền đi!",
                    "Bạn ơi, thằng ôn con {user} nó báo nhà báo cửa chưa đủ hay sao mà nó báo luôn cả bạn vậy? Khoản nợ {amount} của nó đang chình ình trong hệ thống của chúng tôi và tên bạn nằm ngay bên cạnh. Tốt nhất là bạn cầm chổi sang quất vào mông nó bắt nó trả tiền. Đời thuở nào đi làm tham chiếu cho con nợ ngập đầu?",
                    "Tin buồn trong ngày: Bạn bỗng dưng trở thành 'kẻ bị làm phiền' của tín dụng đen chỉ vì thằng bạn {user}. Nó nợ {amount} và chúng tôi sẽ spam bạn liên tục. Nếu không muốn đau đầu nhức óc, hãy sang đấm nó một trận và bắt nó gõ `/loan repay` ngay lập tức! Thân ái và quyết thắng!",
                    "Lại là chúng tôi đây! Thằng ôn {user} mà bạn tin tưởng làm người bảo lãnh vẫn đang nợ {amount}. Tình bạn của các bạn chắc bền lâu? Gọi điện chửi mắng nó giùm chúng tôi, ép nó `/loan repay` đi, nếu không mỗi giờ chúng tôi lại gửi cho bạn một tin nhắn yêu thương thế này đấy!",
                    "Xin chào người bạn vàng của {user}! Chắc bạn không biết nó nợ chúng tôi {amount} đâu nhỉ? Nó để lại thông tin của bạn để chúng tôi 'chăm sóc' đấy. Hãy là một người bạn tốt, tát cho nó tỉnh ra và bắt nó gõ `/loan repay` trả nợ ngay đi!",
                    "Bạn nghĩ sao về một người bạn như {user}? Ăn chơi bạt mạng mượn {amount} rồi lặn mất tăm, quăng lại tên bạn cho ngân hàng Gunter. Giúp chúng tôi đòi nợ nó bằng cách khủng bố tin nhắn nó nhé, bảo nó mau trả nợ bằng `/loan repay`!",
                    "Thông báo tìm trẻ lạc: Thằng {user} đang ôm {amount} của chúng tôi bỏ trốn. Vì bạn là người tham chiếu, phiền bạn nhắn nó một câu: 'Chơi thì chịu, vay thì trả'. Bảo nó vào cày `/work` và trả nợ đi trước khi chúng tôi cắm trại trước nhà bạn!",
                    "Trần đời ai lại đi bảo lãnh cho thằng khứa {user} vay {amount}? Bạn đúng là người tốt, nhưng tốt sai người rồi! Hãy trút giận lên đầu nó, bắt nó vào trả nợ bằng `/loan repay`. Đến khi nó trả xong, chúng tôi mới tha cho bạn!"
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
                                    const rMsg = refMsgs[Math.floor(Math.random() * refMsgs.length)]
                                        .replace('{user}', userName)
                                        .replace('{amount}', user.loanAmount.toLocaleString() + ' 🪙');
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


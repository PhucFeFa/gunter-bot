/**
 * events/interactionCreate.js
 * Routes incoming slash commands to the correct handler.
 */

const { Events, InteractionType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getConfig } = require('../utils/configDB');
const { checkCooldown } = require('../utils/cooldown');
const liveGameManager = require('../utils/liveGameManager');

module.exports = {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction, client) {
        // BẢO MẬT: Chỉ hoạt động trên 1 server duy nhất
        if (interaction.guildId !== process.env.DISCORD_GUILD_ID) {
            if (interaction.isRepliable()) {
                return interaction.reply({ content: '❌ Bot này là phiên bản độc quyền. Nó không hoạt động ở server này!', flags: 64 });
            }
            return;
        }

        if (interaction.isButton()) {
            const { handleTicketButton } = require('../utils/ticketSystem');
            if (interaction.customId.startsWith('ticket_')) {
                return await handleTicketButton(interaction);
            }

            // ─ Aviator Live: nut cashout ─
            if (interaction.customId === 'liveaviator_cashout') {
                const game = liveGameManager.getByChannel(interaction.channelId);
                if (game && game.gameType === 'aviator') {
                    const result = await game.cashout(interaction.user.id, interaction.user.username);
                    if (result) {
                        return interaction.reply({ content: `💵 **${interaction.user.username}** đã rút tại **${result.mult.toFixed(2)}x** — nhận **${result.winAmount.toLocaleString()} 🪙**!` });
                    } else {
                        return interaction.reply({ content: '❌ Không thể rút (chưa đặt cược hoặc đã rút rồi)!', flags: 64 });
                    }
                }
            }

            // ─ Baccarat Live: nut bet (mở modal nhập tiền) ─
            if (['livebacc_banker', 'livebacc_player', 'livebacc_tie'].includes(interaction.customId)) {
                const game = liveGameManager.getByChannel(interaction.channelId);
                if (!game || game.gameType !== 'baccarat') return interaction.reply({ content: '❌ Không có game Baccarat ở kênh này!', flags: 64 });

                const side = interaction.customId.replace('livebacc_', '');
                const modal = new ModalBuilder()
                    .setCustomId(`baccmodal_${side}`)
                    .setTitle(`🎴 Bạn đặt cược ${side.toUpperCase()}`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('bacc_amount')
                                .setLabel('Số tiền cược')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('VD: 10000 hoặc all')
                                .setRequired(true)
                        )
                    );
                return interaction.showModal(modal);
            }

            // ─ Taixiu Live: nut bet (mở modal nhập tiền) ─
            if (['livetx_tai', 'livetx_xiu'].includes(interaction.customId)) {
                const game = liveGameManager.getByChannel(interaction.channelId);
                if (!game || game.gameType !== 'taixiu') return interaction.reply({ content: '❌ Không có game Tài Xỉu ở kênh này!', flags: 64 });

                const side = interaction.customId.replace('livetx_', '');
                const label = side === 'tai' ? '⚫ TÀI' : '⚪ XỈU';
                const modal = new ModalBuilder()
                    .setCustomId(`txmodal_${side}`)
                    .setTitle(`🎲 Bạn đặt cược ${label}`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('tx_amount')
                                .setLabel('Số tiền cược')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('VD: 10000 hoặc all')
                                .setRequired(true)
                        )
                    );
                return interaction.showModal(modal);
            }

            // ─ Aviator Live: nut bet (mở modal nhập tiền) ─
            if (interaction.customId === 'liveaviator_bet') {
                const game = liveGameManager.getByChannel(interaction.channelId);
                if (!game || game.gameType !== 'aviator') return interaction.reply({ content: '❌ Không có game Aviator ở kênh này!', flags: 64 });

                const modal = new ModalBuilder()
                    .setCustomId('aviatormodal_bet')
                    .setTitle('🚀 Đặt cược Aviator')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('aviator_amount')
                                .setLabel('Số tiền cược')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('VD: 10000 hoặc all')
                                .setRequired(true)
                        )
                    );
                return interaction.showModal(modal);
            }

            // ─ Bóng Đá Live: nut bet (mở modal nhập tiền) ─
            if (interaction.customId.startsWith('bongdabet_')) {
                const game = liveGameManager.getByChannel(interaction.channelId);
                if (!game || game.gameType !== 'bongda') return interaction.reply({ content: '❌ Sòng Bóng Đá ở kênh này hiện đang ĐÓNG CỬA! Gọi Admin mở lại nhé!', flags: 64 });

                const parts = interaction.customId.split('_');
                const matchId = parts[1];
                const choice = parts[2];
                let choiceName = choice === 'home' ? 'ĐỘI NHÀ' : (choice === 'away' ? 'ĐỘI KHÁCH' : 'HÒA');

                const modal = new ModalBuilder()
                    .setCustomId(`bongdamodal_${matchId}_${choice}`)
                    .setTitle(`⚽ Bạn cược ${choiceName}`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('bongda_amount')
                                .setLabel('Số tiền cược')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('VD: 10000 hoặc all')
                                .setRequired(true)
                        )
                    );
                return interaction.showModal(modal);
            }
        }

        // ─ Xử lý modal submit (Baccarat / Aviator bet) ─
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('baccmodal_')) {
                const side = interaction.customId.replace('baccmodal_', '');
                const rawAmt = interaction.fields.getTextInputValue('bacc_amount').toLowerCase();
                const game = liveGameManager.getByChannel(interaction.channelId);

                if (!game || game.gameType !== 'baccarat') {
                    return interaction.reply({ content: '❌ Không có game Baccarat ở kênh này!', flags: 64 });
                }

                const userData = await require('../utils/economyDB').getUser(interaction.user.id);
                const balance = userData.balance;
                const amount = rawAmt === 'all' ? balance : parseInt(rawAmt);

                const fakeMsg = {
                    author: interaction.user,
                    reply: async (opts) => {
                        const payload = typeof opts === 'string' ? { content: opts } : opts;
                        const response = await interaction.reply({ ...payload, withResponse: true }).catch(() => interaction.followUp({ ...payload, withResponse: true }));
                        // Return the interaction response message so subsequent edits work correctly
                        return response?.resource?.message || response;
                    }
                };
                await game.placeBet(fakeMsg, side, amount);
                return;
            }

            if (interaction.customId.startsWith('txmodal_')) {
                const side = interaction.customId.replace('txmodal_', '');
                const rawAmt = interaction.fields.getTextInputValue('tx_amount').toLowerCase();
                const game = liveGameManager.getByChannel(interaction.channelId);

                if (!game || game.gameType !== 'taixiu') {
                    return interaction.reply({ content: '❌ Không có game Tài Xỉu ở kênh này!', flags: 64 });
                }

                const userData = await require('../utils/economyDB').getUser(interaction.user.id);
                const balance = userData.balance;
                const amount = rawAmt === 'all' ? balance : parseInt(rawAmt);

                const fakeMsg = {
                    author: interaction.user,
                    reply: async (opts) => {
                        const payload = typeof opts === 'string' ? { content: opts } : opts;
                        const response = await interaction.reply({ ...payload, withResponse: true }).catch(() => interaction.followUp({ ...payload, withResponse: true }));
                        return response?.resource?.message || response;
                    }
                };
                await game.placeBet(fakeMsg, side, amount);
                return;
            }

            if (interaction.customId === 'aviatormodal_bet') {
                const rawAmt = interaction.fields.getTextInputValue('aviator_amount').toLowerCase();
                const game = liveGameManager.getByChannel(interaction.channelId);

                if (!game || game.gameType !== 'aviator') {
                    return interaction.reply({ content: '❌ Không có game Aviator ở kênh này!', flags: 64 });
                }

                const userData = await require('../utils/economyDB').getUser(interaction.user.id);
                const balance = userData.balance;
                const amount = rawAmt === 'all' ? balance : parseInt(rawAmt);

                const fakeMsg = {
                    author: interaction.user,
                    reply: async (opts) => {
                        const payload = typeof opts === 'string' ? { content: opts } : opts;
                        const response = await interaction.reply({ ...payload, withResponse: true }).catch(() => interaction.followUp({ ...payload, withResponse: true }));
                        // Return the interaction response message so subsequent edits work correctly
                        return response?.resource?.message || response;
                    }
                };
                await game.placeBet(fakeMsg, amount);
                return;
            }

            if (interaction.customId.startsWith('bongdamodal_')) {
                const game = liveGameManager.getByChannel(interaction.channelId);
                if (!game || game.gameType !== 'bongda') return interaction.reply({ content: '❌ Sòng Bóng Đá ở kênh này đã ĐÓNG CỬA!', flags: 64 });

                const parts = interaction.customId.split('_');
                const matchId = parseInt(parts[1]);
                const choice = parts[2];
                const rawAmt = interaction.fields.getTextInputValue('bongda_amount').toLowerCase();
                
                const { getUser, updateBalance } = require('../utils/economyDB');
                const fs = require('fs');
                const path = require('path');
                const BETS_FILE = path.join(__dirname, '..', 'data', 'footballBets.json');

                const userData = await getUser(interaction.user.id);
                const balance = userData.balance;
                const amount = rawAmt === 'all' ? balance : parseInt(rawAmt);

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '❌ Tiền cược không hợp lệ!', flags: 64 });
                }

                if (balance < amount) {
                    return interaction.reply({ content: `❌ Trong túi còn có **${balance.toLocaleString()} 🪙** mà đòi cược ${amount.toLocaleString()}?`, flags: 64 });
                }

                await updateBalance(interaction.user.id, -amount);
                
                let data = { bets: [] };
                try { data = JSON.parse(fs.readFileSync(BETS_FILE, 'utf-8')); } catch(e){}

                const { getCachedMatches } = require('../commands/economy/bongda.js');
                const cachedMatches = getCachedMatches();
                const matchInfo = cachedMatches.find(m => m.matchId.toString() === matchId.toString());
                
                if (!matchInfo) {
                    return interaction.reply({ content: '❌ Trận đấu này không còn mở cược nữa hoặc danh sách đã cũ! Vui lòng dùng lệnh `/bongda list` để xem lại.', flags: 64 });
                }
                
                if (matchInfo.status !== 0) {
                    return interaction.reply({ content: '❌ Khôn như Sếp quê em đầy! Trận đấu đã bắt đầu hoặc kết thúc, không được phép cược nữa!', flags: 64 });
                }

                const homeName = matchInfo.homeName;
                const awayName = matchInfo.awayName;

                data.bets.push({
                    userId: interaction.user.id,
                    matchId,
                    homeName,
                    awayName,
                    choice,
                    amount,
                    odds: 1.95,
                    timestamp: Date.now(),
                    status: 'PENDING'
                });
                fs.writeFileSync(BETS_FILE, JSON.stringify(data, null, 4));

                let choiceDisplay = choice === 'home' ? `Đội Nhà (${homeName})` : (choice === 'away' ? `Đội Khách (${awayName})` : 'Hòa (Draw)');
                const embed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setTitle('🎰 XUỐNG XÁC THÀNH CÔNG!')
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3067/3067576.png')
                    .setDescription(`Mày vừa vứt **${amount.toLocaleString()} 🪙** vào cửa **${choiceDisplay}** cho trận \`${homeName} vs ${awayName}\` (Mã \`${matchId}\`).\n\n💰 Nếu thắng mày húp: **${(amount * 1.95).toLocaleString()} 🪙**`)
                    .setFooter({ text: 'Kết quả sẽ được tự động quyết toán khi trận đấu kết thúc (FT).' });

                return interaction.reply({ embeds: [embed] });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('ticket_')) {
                const { handleTicketSelect } = require('../utils/ticketSystem');
                return await handleTicketSelect(interaction);
            }
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.warn(`[CMD] Unknown command received: ${interaction.commandName}`);
            return interaction.reply({ content: '❌ Lệnh không tồn tại!', flags: 64 });
        }

        try {
            // Kiểm tra xem lệnh có bị tắt không hoặc kênh có bị chặn không
            if (interaction.guildId) {
                const config = await getConfig(interaction.guildId);
                const cmdName = interaction.commandName;

                // --- KIỂM TRA CHẶN KÊNH (IGNORE CHANNEL) ---
                const ignoredChannels = config.ignored_channels || [];
                const isAdmin = interaction.memberPermissions && interaction.memberPermissions.has('Administrator');
                if (ignoredChannels.includes(interaction.channelId) && !isAdmin) {
                    return interaction.reply({ content: '🚫 Kênh này đã bị cấm dùng bot!', flags: 64 }); // 64 = Ephemeral
                }

                // Nhóm economy
                if (['daily', 'slots', 'balance'].includes(cmdName) && !config.feature_economy) {
                    return interaction.reply({ content: '❌ Tính năng Economy đang bị tắt trên server này!', flags: 64 });
                }

                // Avatar
                if (cmdName === 'avatar' && !config.feature_avatar) {
                    return interaction.reply({ content: '❌ Tính năng xem Avatar đang bị tắt trên server này!', flags: 64 });
                }
            }

            if (!checkCooldown(interaction.user.id, 2000)) {
                return interaction.reply({ content: '⏳ Đừng spam lệnh quá nhanh! Vui lòng chờ 2 giây.', flags: 64 });
            }

            await command.execute(interaction);
        } catch (error) {
            console.error(`[CMD] Error executing /${interaction.commandName}:`, error);
            
            let errorMsg = '❌ Đã xảy ra lỗi khi thực thi lệnh!';
            // Thông báo rõ ràng nếu do lỗi database (Firebase Quota)
            if (error.details && error.details.includes('Quota exceeded')) {
                errorMsg = '❌ Hệ thống lưu trữ dữ liệu (Database) đã hết dung lượng miễn phí trong hôm nay! Vui lòng chờ reset vào ngày mai hoặc nâng cấp hệ thống.';
            }

            const payload = { content: errorMsg, flags: 64 };

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(payload);
                } else {
                    await interaction.reply(payload);
                }
            } catch (followUpError) {
                console.error('[CMD] Không thể gửi thông báo lỗi cho người dùng:', followUpError.message);
            }
        }
    },
};

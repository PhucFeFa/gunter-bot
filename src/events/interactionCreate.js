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
        }

        // ─ Xử lý modal submit (Baccarat bet) ─
        if (interaction.isModalSubmit() && interaction.customId.startsWith('baccmodal_')) {
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
                    const m = await interaction.reply({ ...payload, fetchReply: true }).catch(() => interaction.followUp({ ...payload, fetchReply: true }));
                    return m;
                }
            };
            await game.placeBet(fakeMsg, side, amount);
            return;
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

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`[CMD] Error executing /${interaction.commandName}:`, error);
            const errorMsg = { content: '❌ Đã xảy ra lỗi khi thực thi lệnh!', flags: 64 };

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMsg);
                } else {
                    await interaction.reply(errorMsg);
                }
            } catch (followUpError) {
                console.error('[CMD] Không thể gửi thông báo lỗi cho người dùng (có thể tin nhắn gốc đã bị xóa):', followUpError.message);
            }
        }
    },
};

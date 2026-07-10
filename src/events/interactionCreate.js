/**
 * events/interactionCreate.js
 * Routes incoming slash commands to the correct handler.
 */

const { Events, InteractionType, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils/configDB');
const { checkCooldown } = require('../utils/cooldown');

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

        // --- BẢO TRÌ: CHỈ OWNER MỚI ĐƯỢC DÙNG BOT ---
        if (process.env.OWNER_IDS) {
            const ownerIds = process.env.OWNER_IDS.split(',').map(id => id.trim());
            if (!ownerIds.includes(interaction.user.id)) {
                return interaction.reply({ content: '⛔ Bot đang trong chế độ bảo trì ngầm. Chỉ có Owner mới được phép sử dụng!', flags: 64 });
            }
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

/**
 * events/interactionCreate.js
 * Routes incoming slash commands to the correct handler.
 */

const { Events, InteractionType, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils/configDB');

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
            if (interaction.customId === 'help_category_select') {
                const { handleHelpSelect } = require('../utils/helpSystem');
                return await handleHelpSelect(interaction, client);
            }
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.warn(`[CMD] Unknown command received: ${interaction.commandName}`);
            return interaction.reply({ content: '❌ Lệnh không tồn tại!', flags: 64 });
        }

        // Kiểm tra xem lệnh có bị tắt không
        if (interaction.guildId) {
            const config = await getConfig(interaction.guildId);
            const cmdName = interaction.commandName;
            
            // Nhóm economy
            if (['daily', 'slots', 'balance'].includes(cmdName) && !config.feature_economy) {
                return interaction.reply({ content: '❌ Tính năng Economy đang bị tắt trên server này!', flags: 64 });
            }
            
            // Avatar
            if (cmdName === 'avatar' && !config.feature_avatar) {
                return interaction.reply({ content: '❌ Tính năng xem Avatar đang bị tắt trên server này!', flags: 64 });
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

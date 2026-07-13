const { SlashCommandBuilder } = require('discord.js');
const liveGameManager = require('../../utils/liveGameManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aviator')
        .setDescription('🚀 Chơi Aviator (Chỉ dùng được trong kênh Live Game)')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Số tiền cược')
                .setRequired(false)),
                
    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 64 });
        }

        const guildId = interaction.guildId;
        const liveChannelId = liveGameManager.getChannelByType(guildId, 'aviator');

        if (liveChannelId) {
            return interaction.editReply(`❌ Trò chơi này không còn hỗ trợ chơi đơn! Hãy tham gia bàn **Aviator Live** tại kênh <#${liveChannelId}>!`);
        } else {
            return interaction.editReply(`❌ Trò chơi này không còn hỗ trợ chơi đơn! Vui lòng chờ Admin mở bàn **Aviator Live** (lệnh \`/livegame\`).`);
        }
    },

    async executePrefix(message, args, client) {
        const guildId = message.guildId;
        const liveChannelId = liveGameManager.getChannelByType(guildId, 'aviator');

        if (liveChannelId) {
            return message.reply(`❌ Trò chơi này không còn hỗ trợ chơi đơn! Hãy tham gia bàn **Aviator Live** tại kênh <#${liveChannelId}>!`);
        } else {
            return message.reply(`❌ Trò chơi này không còn hỗ trợ chơi đơn! Vui lòng chờ Admin mở bàn **Aviator Live** (lệnh \`/livegame\`).`);
        }
    }
};

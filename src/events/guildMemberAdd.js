/**
 * events/guildMemberAdd.js
 * Gửi tin nhắn chào mừng khi có thành viên mới vào server
 */

const { Events, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils/configDB');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member, client) {
        const config = await getConfig(member.guild.id);
        
        // Nếu tính năng bị tắt hoặc chưa cài đặt kênh, thì bỏ qua
        if (!config.feature_welcome || !config.welcome_channel_id) return;
        
        const channel = member.guild.channels.cache.get(config.welcome_channel_id);
        if (!channel) return;
        
        // Lấy số thứ tự của thành viên
        const memberCount = member.guild.memberCount;
        const guildName = member.guild.name;
        
        // Tạo Embed giống mẫu trong ảnh
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31) // Màu xám đen giống giao diện Discord
            .setAuthor({ 
                name: `/${guildName}`, 
                iconURL: member.guild.iconURL() || client.user.displayAvatarURL()
            })
            .setDescription(`<@${member.user.id}>\n\nWelcome to the server!\n\n/${guildName} is now at **${memberCount}** members`)
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }));
            
        try {
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('[WELCOME] Lỗi không gửi được tin nhắn chào mừng:', error);
        }
    },
};

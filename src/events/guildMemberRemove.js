/**
 * events/guildMemberRemove.js
 * Gửi thông báo khi có thành viên rời server
 */

const { Events, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils/configDB');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member, client) {
        const config = await getConfig(member.guild.id);
        
        // Nếu tính năng bị tắt hoặc chưa cài đặt kênh, thì bỏ qua
        if (!config.feature_goodbye || !config.goodbye_channel_id) return;
        
        const channel = member.guild.channels.cache.get(config.goodbye_channel_id);
        if (!channel) return;
        
        // Lấy số thứ tự của thành viên (hiện tại)
        const memberCount = member.guild.memberCount;
        const guildName = member.guild.name;
        
        // Tạo Embed tối màu giống bản gốc
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setAuthor({ 
                name: `/${guildName}`, 
                iconURL: member.guild.iconURL() || client.user.displayAvatarURL()
            })
            .setDescription(`<@${member.user.id}>\n\nĐã rời khỏi server.\n\n/${guildName} is now at **${memberCount}** members`)
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }));
            
        try {
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('[GOODBYE] Lỗi không gửi được thông báo rời đi:', error);
        }
    },
};

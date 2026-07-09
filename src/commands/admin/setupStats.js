const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getConfig, updateConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-stats')
        .setDescription('Tạo các kênh thống kê Server (Server Stats).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option => option.setName('role1').setDescription('Role thứ 1 muốn thống kê').setRequired(false))
        .addRoleOption(option => option.setName('role2').setDescription('Role thứ 2 muốn thống kê').setRequired(false))
        .addRoleOption(option => option.setName('role3').setDescription('Role thứ 3 muốn thống kê').setRequired(false)),

    async execute(interaction) {
        // Kiểm tra Bot Owner
        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(id => id.trim());
        if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Cút Cút! Chỉ có "Chủ Tịch" mới được xài lệnh này.', flags: 64 });

        await interaction.deferReply();
        const guild = interaction.guild;
        
        // Cập nhật bộ nhớ cache cho member trước khi đếm
        await guild.members.fetch();

        // 1. Tạo Category
        const category = await guild.channels.create({
            name: '📊 SERVER STATS 📊',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.Connect], // Khóa không cho ai join vào
                },
            ],
        });

        // 2. Tạo kênh đếm tổng thành viên (Cả người lẫn bot)
        const allMembersChannel = await guild.channels.create({
            name: `All members: ${guild.memberCount}`,
            type: ChannelType.GuildVoice,
            parent: category.id,
        });

        // 3. Tạo kênh đếm thành viên là con người (Lọc bỏ bot)
        const realMemberCount = guild.members.cache.filter(m => !m.user.bot).size;
        const membersChannel = await guild.channels.create({
            name: `Members: ${realMemberCount}`,
            type: ChannelType.GuildVoice,
            parent: category.id,
        });

        const statsData = {
            category_id: category.id,
            all_members_id: allMembersChannel.id,
            members_id: membersChannel.id,
            roles: {}
        };

        // 4. Tạo kênh đếm các role được chọn
        const rolesToTrack = [
            interaction.options.getRole('role1'),
            interaction.options.getRole('role2'),
            interaction.options.getRole('role3')
        ].filter(r => r !== null);

        for (const role of rolesToTrack) {
            const memberCount = guild.members.cache.filter(m => m.roles.cache.has(role.id)).size;
            
            const roleChannel = await guild.channels.create({
                name: `${role.name}: ${memberCount}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
            });
            
            statsData.roles[roleChannel.id] = role.id;
        }

        // Lưu toàn bộ cấu hình vào Firebase
        await updateConfig(guild.id, 'stats_data', statsData);
        await updateConfig(guild.id, 'feature_stats', true);

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('📊 Đã tạo Server Stats thành công!')
            .setDescription('Bot sẽ tự động đếm và cập nhật các con số này mỗi 15 phút để tránh bị Discord khóa (rate limit).')
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    },
};

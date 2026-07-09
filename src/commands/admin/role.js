const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Quản lý Role (Thêm/Xóa) của thành viên.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Cấp role cho một người dùng')
                .addUserOption(option => option.setName('target').setDescription('Thành viên bạn muốn cấp').setRequired(true))
                .addRoleOption(option => option.setName('role1').setDescription('Role thứ 1').setRequired(true))
                .addRoleOption(option => option.setName('role2').setDescription('Role thứ 2 (Không bắt buộc)').setRequired(false))
                .addRoleOption(option => option.setName('role3').setDescription('Role thứ 3 (Không bắt buộc)').setRequired(false))
                .addRoleOption(option => option.setName('role4').setDescription('Role thứ 4 (Không bắt buộc)').setRequired(false))
                .addRoleOption(option => option.setName('role5').setDescription('Role thứ 5 (Không bắt buộc)').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Thu hồi role của một người dùng')
                .addUserOption(option => option.setName('target').setDescription('Thành viên bạn muốn thu hồi').setRequired(true))
                .addRoleOption(option => option.setName('role1').setDescription('Role thứ 1').setRequired(true))
                .addRoleOption(option => option.setName('role2').setDescription('Role thứ 2 (Không bắt buộc)').setRequired(false))
                .addRoleOption(option => option.setName('role3').setDescription('Role thứ 3 (Không bắt buộc)').setRequired(false))
                .addRoleOption(option => option.setName('role4').setDescription('Role thứ 4 (Không bắt buộc)').setRequired(false))
                .addRoleOption(option => option.setName('role5').setDescription('Role thứ 5 (Không bắt buộc)').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Xóa TOÀN BỘ role của một người dùng')
                .addUserOption(option => option.setName('target').setDescription('Thành viên bạn muốn lột sạch role').setRequired(true))
        ),

    async execute(interaction) {
        // Có thể mở khoá Bot Owner check nếu bạn muốn chặn cả Admin khác
        // const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(id => id.trim());
        // if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Cút Cút! Chỉ có "Chủ Tịch" mới được xài lệnh này.', flags: 64 });

        await interaction.deferReply();
        
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('target');
        
        // Thu thập tất cả các role được người dùng nhập vào
        const rolesToProcess = [
            interaction.options.getRole('role1'),
            interaction.options.getRole('role2'),
            interaction.options.getRole('role3'),
            interaction.options.getRole('role4'),
            interaction.options.getRole('role5')
        ].filter(r => r !== null);

        // Lọc loại bỏ trùng lặp (Nếu người dùng chọn 5 role giống hệt nhau)
        const uniqueRoles = [...new Map(rolesToProcess.map(r => [r.id, r])).values()];

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.editReply({ content: '❌ Không tìm thấy người dùng này trong server.' });
        }

        try {
            if (subcommand === 'clear') {
                // Lấy tất cả role của người dùng (trừ role @everyone mặc định)
                const userRoles = targetMember.roles.cache.filter(role => role.id !== interaction.guild.id);
                
                // Chỉ lấy những role mà bot có quyền xóa (nằm thấp hơn bot)
                const removableRoles = userRoles.filter(role => interaction.guild.members.me.roles.highest.position > role.position);
                
                if (removableRoles.size === 0) {
                    return interaction.editReply({ content: `⚠️ **${targetUser.username}** không có role nào, hoặc các role của họ nằm cao hơn quyền hạn của bot!` });
                }

                await targetMember.roles.remove(removableRoles);
                return interaction.editReply({ content: `✅ Đã **lột sạch** ${removableRoles.size} role của **${targetUser.username}**!` });
            }

            // Kiểm tra xem bot có quyền xử lý các role này không (Dành cho add/remove)
            const unmanageableRoles = uniqueRoles.filter(role => interaction.guild.members.me.roles.highest.position <= role.position);
            if (unmanageableRoles.length > 0) {
                return interaction.editReply({ 
                    content: `❌ Tôi không đủ quyền để thao tác với role ${unmanageableRoles.map(r => r.toString()).join(', ')} do nó nằm cao hơn tôi!` 
                });
            }

            const processedNames = uniqueRoles.map(r => r.toString()).join(', ');

            if (subcommand === 'add') {
                await targetMember.roles.add(uniqueRoles);
                await interaction.editReply({ content: `✅ Đã **cấp** các role: ${processedNames} cho **${targetUser.username}** thành công.` });
                
            } else if (subcommand === 'remove') {
                await targetMember.roles.remove(uniqueRoles);
                await interaction.editReply({ content: `✅ Đã **thu hồi** các role: ${processedNames} của **${targetUser.username}** thành công.` });
            }
        } catch (error) {
            console.error('[ROLE] Lỗi thao tác role:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi! Có thể do bot thiếu quyền Manage Roles.' });
        }
    }
};

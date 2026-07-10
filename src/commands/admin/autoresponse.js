const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addResponse, removeResponse, getResponses } = require('../../utils/autoResponderDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoresponse')
        .setDescription('🤖 Quản lý bộ tự động trả lời (Auto-Responder)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Chỉ Admin
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Thêm một Auto-Response mới')
                .addStringOption(option => 
                    option.setName('trigger')
                        .setDescription('Từ khóa kích hoạt (cách nhau bởi dấu phẩy)')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('response')
                        .setDescription('Câu trả lời của bot')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('match_type')
                        .setDescription('Kiểu khớp (exact / contains / regex)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Khớp chính xác (exact)', value: 'exact' },
                            { name: 'Có chứa (contains)', value: 'contains' },
                            { name: 'Biểu thức chính quy (regex)', value: 'regex' }
                        ))
                .addIntegerOption(option => 
                    option.setName('cooldown')
                        .setDescription('Thời gian chờ giữa các lần kích hoạt (giây) - Mặc định: 5s')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('channels')
                        .setDescription('ID các kênh áp dụng (cách nhau bởi dấu phẩy) - Trống là tất cả kênh')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Xóa một Auto-Response')
                .addStringOption(option => 
                    option.setName('id')
                        .setDescription('ID của rule cần xóa (dùng lệnh list để xem)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('Xem danh sách Auto-Response hiện tại')),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Mày đéo có quyền dùng lệnh này! Chỉ Admin thôi nhé.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const triggerRaw = interaction.options.getString('trigger');
            const responseText = interaction.options.getString('response');
            const matchType = interaction.options.getString('match_type');
            const cooldown = interaction.options.getInteger('cooldown') || 5;
            const channelsRaw = interaction.options.getString('channels') || '';
            
            // Nếu dùng regex, lưu nguyên chuỗi pattern (ví dụ: "^chào.*" sẽ lưu mảng có 1 phần tử ["^chào.*"])
            let triggers = [];
            if (matchType === 'regex') {
                try {
                    new RegExp(triggerRaw); // Test thử regex xem hợp lệ không
                    triggers = [triggerRaw];
                } catch (e) {
                    return interaction.reply({ content: `❌ Regex không hợp lệ: \`${e.message}\``, ephemeral: true });
                }
            } else {
                triggers = triggerRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
            }

            const channels = channelsRaw.split(',').map(c => c.trim()).filter(c => c.length > 0);

            const newId = addResponse(triggers, responseText, matchType, cooldown, channels);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Thêm Auto-Response Thành Công!')
                .setDescription(`**ID Rule:** \`${newId}\`\n**Từ khóa:** \`${triggers.join(', ')}\`\n**Kiểu khớp:** \`${matchType}\`\n**Cooldown:** \`${cooldown}s\``)
                .addFields(
                    { name: '🤖 Bot sẽ trả lời:', value: responseText },
                    { name: '📍 Kênh áp dụng:', value: channels.length > 0 ? channels.map(c => `<#${c}>`).join(', ') : 'Tất cả kênh' }
                );

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'remove') {
            const idToRemove = interaction.options.getString('id');
            const success = removeResponse(idToRemove);

            if (success) {
                await interaction.reply({ content: `✅ Đã xóa rule có ID: \`${idToRemove}\`` });
            } else {
                await interaction.reply({ content: `❌ Không tìm thấy rule nào có ID: \`${idToRemove}\``, ephemeral: true });
            }

        } else if (subcommand === 'list') {
            const list = getResponses();
            
            if (list.length === 0) {
                return interaction.reply('Hiện tại đéo có cái rule Auto-Response nào cả.');
            }

            const embeds = [];
            let currentEmbed = new EmbedBuilder().setColor(0x3498DB).setTitle('📋 Danh sách Auto-Response');
            let fieldCount = 0;

            list.forEach((item, index) => {
                const trigs = item.trigger.join(', ');
                const chans = item.channels && item.channels.length > 0 ? item.channels.join(', ') : 'All';
                const desc = `**Từ khóa:** \`${trigs}\`\n**Rep:** "${item.response}"\n**Type:** \`${item.match_type}\` | **CD:** \`${item.cooldown}s\` | **Kênh:** ${chans}`;
                
                currentEmbed.addFields({ name: `[${index + 1}] ID: ${item.id}`, value: desc, inline: false });
                fieldCount++;

                // Discord chỉ cho tối đa 25 fields mỗi embed
                if (fieldCount === 25) {
                    embeds.push(currentEmbed);
                    currentEmbed = new EmbedBuilder().setColor(0x3498DB);
                    fieldCount = 0;
                }
            });

            if (fieldCount > 0) embeds.push(currentEmbed);

            await interaction.reply({ embeds: embeds });
        }
    }
};

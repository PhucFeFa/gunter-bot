const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configDB');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách các lệnh của bot.'),

    async execute(interaction) {
        const config = await getConfig(interaction.guildId);
        const prefix = config.prefix || 'g!';

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📖 Gunter Bot - Trung tâm trợ giúp')
            .setDescription(`Prefix hiện tại của server: \`${prefix}\`\nBạn có thể sử dụng các lệnh bằng **Slash Command** (gõ \`/\`) hoặc **Prefix Command** (gõ \`${prefix}\` trước tên lệnh).\n*Ví dụ: \`/daily\` hoặc \`${prefix}daily\`*\n\nVui lòng chọn một danh mục bên dưới để xem chi tiết!`)
            .setThumbnail(interaction.client.user.displayAvatarURL());

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_category_select')
                .setPlaceholder('Chọn một danh mục...')
                .addOptions([
                    { label: 'Admin & Setup', description: 'Các lệnh quản trị và cài đặt bot', value: 'admin', emoji: '⚙️' },
                    { label: 'Moderation', description: 'Quản lý thành viên (Kick, Ban, Mute, Prison)', value: 'moderation', emoji: '🛡️' },
                    { label: 'Economy & Games', description: 'Kinh tế, cờ bạc, và trò chơi', value: 'economy', emoji: '💰' },
                    { label: 'Music', description: 'Phát nhạc', value: 'music', emoji: '🎵' },
                    { label: 'Utility', description: 'Tiện ích chung', value: 'utility', emoji: '🛠️' }
                ])
        );

        const replyMessage = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });

        // Tạo Collector để quản lý tương tác (Vô hiệu hóa menu sau 3 phút không dùng)
        const collector = replyMessage.createMessageComponentCollector({ time: 3 * 60 * 1000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'help_category_select') {
                const selectedValue = i.values[0];
                const CATEGORY_MAP = {
                    'admin': { name: '⚙️ Admin & Setup', folder: 'admin' },
                    'moderation': { name: '🛡️ Moderation', folder: 'moderation' },
                    'economy': { name: '💰 Economy & Games', folder: 'economy' },
                    'music': { name: '🎵 Music', folder: 'music' },
                    'utility': { name: '🛠️ Utility', folder: 'utility' }
                };

                const category = CATEGORY_MAP[selectedValue];
                if (!category) return i.reply({ content: 'Lỗi danh mục!', flags: 64 });

                const folderPath = path.join(__dirname, '..', '..', 'commands', category.folder);
                let commandList = '';
                
                if (fs.existsSync(folderPath)) {
                    const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
                    for (const file of commandFiles) {
                        const cmd = require(path.join(folderPath, file));
                        if (cmd && cmd.data) {
                            commandList += `**/${cmd.data.name}**: ${cmd.data.description}\n`;
                        }
                    }
                }

                const newEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle(category.name)
                    .setDescription(commandList || 'Không có lệnh nào.')
                    .setFooter({ text: `Mẹo: Gõ /<lệnh> hoặc ${prefix}<lệnh> để sử dụng.` });

                await i.update({ embeds: [newEmbed] });
            }
        });

        collector.on('end', async () => {
            // Khi hết thời gian, vô hiệu hóa (disabled) bảng menu để giảm tải
            try {
                row.components[0].setDisabled(true);
                await replyMessage.edit({ components: [row] });
            } catch (e) {
                // Ignore errors if message deleted
            }
        });
    },

    // Prefix command support (g!help)
    async executePrefix(message, args, client) {
        const fakeInteraction = {
            guildId: message.guildId,
            client: client,
            reply: async (options) => {
                const opts = { ...options };
                delete opts.ephemeral;
                delete opts.flags;
                const msg = await message.reply(opts);
                msg.createMessageComponentCollector = (opt) => msg.createMessageComponentCollector(opt);
                return msg;
            }
        };
        await this.execute(fakeInteraction);
    }
};

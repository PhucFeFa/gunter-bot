const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CATEGORY_MAP = {
    'admin': { name: '⚙️ Admin & Setup', folder: 'admin' },
    'moderation': { name: '🛡️ Moderation', folder: 'moderation' },
    'economy': { name: '💰 Economy & Games', folder: 'economy' },
    'music': { name: '🎵 Music', folder: 'music' },
    'utility': { name: '🛠️ Utility', folder: 'utility' }
};

async function handleHelpSelect(interaction, client) {
    if (interaction.customId === 'help_category_select') {
        const selectedValue = interaction.values[0];
        const category = CATEGORY_MAP[selectedValue];
        
        if (!category) return interaction.reply({ content: 'Không tìm thấy danh mục này!', flags: 64 });

        const folderPath = path.join(__dirname, '..', 'commands', category.folder);
        
        let commandList = '';
        if (fs.existsSync(folderPath)) {
            const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(path.join(folderPath, file));
                if (command && command.data) {
                    commandList += `**/${command.data.name}**: ${command.data.description}\n`;
                }
            }
        }

        if (!commandList) commandList = 'Không có lệnh nào trong danh mục này.';

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(category.name)
            .setDescription(commandList)
            .setFooter({ text: `Mẹo: Gõ /<lệnh> hoặc g!<lệnh> để sử dụng.` });

        await interaction.update({ embeds: [embed] });
    }
}

module.exports = { handleHelpSelect };

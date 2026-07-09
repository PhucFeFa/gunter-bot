const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { transferMoney } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('💸 Chuyển tiền cho người khác')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Người nhận tiền')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Số lượng tiền muốn chuyển')
                .setRequired(true)
                .setMinValue(1)
        ),
        
    async execute(interaction) {
        await interaction.deferReply();
        
        const targetUser = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');
        await this.handleGive(interaction, targetUser, amount);
    },
    
    async executePrefix(message, args) {
        if (message.mentions.users.size === 0 || !args[1]) {
            return message.reply('❌ Cú pháp sai! Ví dụ: `g!give @user 500`');
        }
        
        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[1].replace(/,/g, ''));
        
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Số tiền không hợp lệ!');
        }

        const fakeInteraction = {
            user: message.author,
            deferReply: async () => await message.channel.sendTyping(),
            editReply: async (options) => await message.reply(options)
        };

        await this.handleGive(fakeInteraction, targetUser, amount);
    },

    async handleGive(interaction, targetUser, amount) {
        if (targetUser.id === interaction.user.id) {
            return interaction.editReply('❌ Bạn không thể tự chuyển tiền cho chính mình!');
        }
        if (targetUser.bot) {
            return interaction.editReply('❌ Bạn không thể chuyển tiền cho Bot!');
        }

        const result = await transferMoney(interaction.user.id, targetUser.id, amount);

        if (!result.success) {
            return interaction.editReply(`❌ Lỗi: ${result.reason}`);
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71) // Xanh lá
            .setTitle('💸 Chuyển Tiền Thành Công')
            .setDescription(`**${interaction.user.username}** đã chuyển thành công **${amount.toLocaleString()} 🪙** cho **${targetUser.username}**!`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

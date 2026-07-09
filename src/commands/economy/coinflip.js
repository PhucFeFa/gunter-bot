const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { updateBalance, getUser } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 Tung đồng xu nhân đôi tài sản hoặc ra đê!')
        .addStringOption(option => 
            option.setName('choice')
                .setDescription('Chọn Mặt Sấp (Ngửa) hoặc Mặt Ngửa (Sấp)')
                .setRequired(true)
                .addChoices(
                    { name: 'Sấp (Heads)', value: 'heads' },
                    { name: 'Ngửa (Tails)', value: 'tails' }
                )
        )
        .addIntegerOption(option => 
            option.setName('bet')
                .setDescription('Số tiền cược')
                .setRequired(true)
                .setMinValue(1)
        ),
        
    async execute(interaction) {
        await interaction.deferReply();
        const choice = interaction.options.getString('choice');
        const bet = interaction.options.getInteger('bet');
        await this.handleCoinflip(interaction, choice, bet);
    },
    
    async executePrefix(message, args) {
        const choice = args[0]?.toLowerCase();
        const betStr = args[1]?.replace(/,/g, '');
        const bet = parseInt(betStr);

        if (!choice || !['s', 'n', 'heads', 'tails', 'sap', 'ngua'].includes(choice) || isNaN(bet) || bet <= 0) {
            return message.reply('❌ Cú pháp sai! Ví dụ: `g!coinflip s 500` (s = Sấp, n = Ngửa)');
        }

        let standardChoice = 'heads';
        if (['n', 'tails', 'ngua'].includes(choice)) standardChoice = 'tails';

        const fakeInteraction = {
            user: message.author,
            deferReply: async () => await message.channel.sendTyping(),
            editReply: async (options) => await message.reply(options)
        };
        await this.handleCoinflip(fakeInteraction, standardChoice, bet);
    },

    async handleCoinflip(interaction, choice, bet) {
        const userDoc = await getUser(interaction.user.id);
        
        if (userDoc.balance < bet) {
            return interaction.editReply(`❌ Mõm à? Bạn chỉ có **${userDoc.balance.toLocaleString()} 🪙**, lấy đâu ra ${bet.toLocaleString()} 🪙 để cược!`);
        }

        // Trừ tiền cược trước
        await updateBalance(interaction.user.id, -bet);

        const isHeads = Math.random() < 0.5;
        const result = isHeads ? 'heads' : 'tails';
        const resultName = isHeads ? 'Sấp' : 'Ngửa';
        const choiceName = choice === 'heads' ? 'Sấp' : 'Ngửa';

        const isWin = choice === result;

        let description = `Bạn đã chọn: **${choiceName}**\nĐồng xu tung ra: **${resultName}**\n\n`;

        if (isWin) {
            const winAmount = bet * 2;
            await updateBalance(interaction.user.id, winAmount); // Trả lại tiền cược + tiền thắng
            description += `🎉 **THẮNG RỒI!** Bạn húp trọn **${winAmount.toLocaleString()} 🪙**!`;
        } else {
            description += `💀 **THUA SẠCH!** Bạn đã cống nạp **${bet.toLocaleString()} 🪙** cho nhà cái!`;
        }

        const embed = new EmbedBuilder()
            .setColor(isWin ? 0x2ECC71 : 0xE74C3C)
            .setTitle('🪙 KẾT QUẢ TUNG ĐỒNG XU')
            .setDescription(description)
            .setThumbnail(isWin ? 'https://media.giphy.com/media/2u11zpzwyMTy8/giphy.gif' : 'https://media.giphy.com/media/XGaq8kbgYkY6eLmsUa/giphy.gif')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

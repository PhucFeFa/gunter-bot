const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { updateBalance, getUser } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('✌️ Kéo - ✊ Búa - ✋ Bao: Đấu trí với Gunter!')
        .addStringOption(option => 
            option.setName('choice')
                .setDescription('Chọn Kéo, Búa, hoặc Bao')
                .setRequired(true)
                .addChoices(
                    { name: '✌️ Kéo', value: 'keo' },
                    { name: '✊ Búa', value: 'bua' },
                    { name: '✋ Bao', value: 'bao' }
                )
        )
        .addStringOption(option => 
            option.setName('bet')
                .setDescription('Số tiền cược (Hoặc gõ "all" để chơi tất tay)')
                .setRequired(true)
        ),
        
    async execute(interaction) {
        await interaction.deferReply();
        const userChoice = interaction.options.getString('choice');
        const betRaw = interaction.options.getString('bet');

        const userData = await getUser(interaction.user.id);
        const currentBalance = userData.balance;

        let bet = 0;
        if (betRaw.toLowerCase() === 'all') {
            bet = currentBalance;
            if (bet <= 0) return interaction.editReply('❌ Bạn không có tiền để cược!');
        } else {
            bet = parseInt(betRaw.replace(/,/g, ''));
            if (isNaN(bet) || bet <= 0) return interaction.editReply('❌ Số tiền cược không hợp lệ!');
        }

        await this.handleRps(interaction, userChoice, bet);
    },
    
    async executePrefix(message, args) {
        const choiceMap = {
            'keo': 'keo', 'kéo': 'keo', 'k': 'keo',
            'bua': 'bua', 'búa': 'bua', 'b': 'bua',
            'bao': 'bao', 'lá': 'bao', 'la': 'bao'
        };
        
        const rawChoice = args[0]?.toLowerCase();
        const userChoice = choiceMap[rawChoice];
        const betStr = args[1]?.replace(/,/g, '');
        const betRaw = betStr?.toLowerCase() === 'all' ? 'all' : parseInt(betStr);

        if (!userChoice || (betStr !== 'all' && (isNaN(betRaw) || betRaw <= 0))) {
            return message.reply('❌ Cú pháp sai! Ví dụ: `g!rps keo 500` hoặc `g!rps b all`');
        }

        const userData = await getUser(message.author.id);
        const bet = betRaw === 'all' ? userData.balance : betRaw;
        
        if (bet <= 0) return message.reply('❌ Bạn không có tiền để cược!');

        const fakeInteraction = {
            user: message.author,
            deferReply: async () => await message.channel.sendTyping(),
            editReply: async (options) => await message.reply(options)
        };
        await this.handleRps(fakeInteraction, userChoice, bet);
    },

    async handleRps(interaction, userChoice, bet) {
        const userDoc = await getUser(interaction.user.id);
        
        if (bet > 250000000) bet = 250000000;

        if (userDoc.balance < bet) {
            return interaction.editReply(`❌ Tiền túi thì có **${userDoc.balance.toLocaleString()} 🪙** mà đòi cược ${bet.toLocaleString()}? Đi làm nhiệm vụ đi!`);
        }

        // Trừ tiền cược
        await updateBalance(interaction.user.id, -bet);

        const choices = ['keo', 'bua', 'bao'];
        const emojiMap = { 'keo': '✌️ (Kéo)', 'bua': '✊ (Búa)', 'bao': '✋ (Bao)' };
        const botChoice = choices[Math.floor(Math.random() * choices.length)];

        let result = ''; // 'win', 'lose', 'tie'
        if (userChoice === botChoice) {
            result = 'tie';
        } else if (
            (userChoice === 'keo' && botChoice === 'bao') ||
            (userChoice === 'bua' && botChoice === 'keo') ||
            (userChoice === 'bao' && botChoice === 'bua')
        ) {
            result = 'win';
        } else {
            result = 'lose';
        }

        let description = `Bạn ra: **${emojiMap[userChoice]}**\nGunter ra: **${emojiMap[botChoice]}**\n\n`;
        let color = 0;

        if (result === 'win') {
            const winAmount = bet * 2;
            await updateBalance(interaction.user.id, winAmount);
            description += `🎉 **TRÍ KHÔN CỦA TA ĐÂY!** Bạn đã thắng và lụm **${winAmount.toLocaleString()} 🪙**!`;
            color = 0x2ECC71;
        } else if (result === 'lose') {
            description += `💀 **ĐỒ NON CƠ!** Gunter đã lụm **${bet.toLocaleString()} 🪙** của bạn!`;
            color = 0xE74C3C;
        } else {
            await updateBalance(interaction.user.id, bet); // Trả lại tiền
            description += `🤝 **HÒA!** Gunter trả lại bạn **${bet.toLocaleString()} 🪙**!`;
            color = 0xF1C40F;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎮 OẲN TÙ TÌ')
            .setDescription(description)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

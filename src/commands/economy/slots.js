/**
 * commands/economy/slots.js
 * ============================================================
 * /slots <amount>
 * Spin the slot machine! Bet your coins and win big.
 *
 * Payout table:
 *  🍒🍒🍒 → x2  (common)
 *  🍋🍋🍋 → x3
 *  🍇🍇🍇 → x4
 *  💎💎💎 → x10 (jackpot!)
 *  Any two matching → x0.5 (small return)
 *  No match         → lose all bet
 * ============================================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');

const REELS   = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎'];
const WEIGHTS = [30,   25,   20,   15,   8,    2  ]; // Weighted probability

// Build a weighted pool
const POOL = [];
REELS.forEach((emoji, i) => {
    for (let w = 0; w < WEIGHTS[i]; w++) POOL.push(emoji);
});

const PAYOUTS = {
    '🍒': 2, '🍋': 3, '🍇': 4, '🍉': 5, '⭐': 8, '💎': 10,
};

function spin() {
    return [
        POOL[Math.floor(Math.random() * POOL.length)],
        POOL[Math.floor(Math.random() * POOL.length)],
        POOL[Math.floor(Math.random() * POOL.length)],
    ];
}

function evaluate(reels, bet) {
    const [a, b, c] = reels;

    if (a === b && b === c) {
        // Jackpot!
        const multiplier = PAYOUTS[a];
        return { result: 'jackpot', profit: bet * multiplier, multiplier };
    }

    if (a === b || b === c || a === c) {
        // Partial match - get half back
        return { result: 'partial', profit: Math.floor(bet * 0.5), multiplier: 0.5 };
    }

    // All different - lose
    return { result: 'lose', profit: -bet, multiplier: 0 };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Quay máy đánh bạc! Thắng lớn, thua đau.')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Số coins muốn cược (tối thiểu 10)')
                .setRequired(true)
                .setMinValue(10)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const bet = interaction.options.getInteger('amount');
        const userData = await getUser(interaction.user.id);

        // Validate balance
        if (userData.balance < bet) {
            const embed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('❌ Không đủ coin!')
                .setDescription(`Số dư của bạn chỉ có **${userData.balance.toLocaleString()} 🪙**.\nBạn đặt cược **${bet.toLocaleString()} 🪙**.`)
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        // Spin!
        const reels = spin();
        const { result, profit, multiplier } = evaluate(reels, bet);

        // Apply to Firestore
        const newBalance = await updateBalance(interaction.user.id, profit);

        // --- Build response embed ---
        let color, title, description;

        const reelDisplay = `╔══════════════╗\n║  ${reels.join('  |  ')}  ║\n╚══════════════╝`;

        if (result === 'jackpot') {
            color = 0xF1C40F;
            title = `🎰 JACKPOT! x${multiplier}`;
            description =
                `${reelDisplay}\n\n` +
                `🎉 BA CÁI GIỐNG NHAU! **x${multiplier}**\n` +
                `💰 Thắng: **+${(bet * multiplier).toLocaleString()} 🪙**\n` +
                `💼 Số dư mới: **${newBalance.toLocaleString()} 🪙**`;
        } else if (result === 'partial') {
            color = 0x3498DB;
            title = '🎰 Khá gần rồi!';
            description =
                `${reelDisplay}\n\n` +
                `🤏 Hai cái khớp, nhận lại **50%** tiền cược.\n` +
                `💰 Nhận lại: **+${profit.toLocaleString()} 🪙**\n` +
                `💼 Số dư mới: **${newBalance.toLocaleString()} 🪙**`;
        } else {
            color = 0xFF6B6B;
            title = '🎰 Thua rồi!';
            description =
                `${reelDisplay}\n\n` +
                `😢 Không khớp! Mất **${bet.toLocaleString()} 🪙** rồi.\n` +
                `💼 Số dư còn: **${newBalance.toLocaleString()} 🪙**`;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setFooter({ text: `Cược: ${bet.toLocaleString()} 🪙 | Bảng thưởng: 💎=x10 ⭐=x8 🍉=x5 🍇=x4 🍋=x3 🍒=x2` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    },
};

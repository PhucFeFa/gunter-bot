const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');

const ADMIN_ID = '586904255860965386';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('take')
        .setDescription('[ADMIN] Cướp tiền của người khác đem về cho admin')
        .addUserOption(opt => opt
            .setName('target')
            .setDescription('Người bị cướp tiền')
            .setRequired(true))
        .addIntegerOption(opt => opt
            .setName('amount')
            .setDescription('Số tiền muốn cướp')
            .setRequired(true)
            .setMinValue(1)),

    async execute(interaction) {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ content: '❌ Bố mày mới được xài lệnh này, mày tuổi tôm!', flags: 64 });
        }

        await interaction.deferReply(); // Công khai tin nhắn cho cả server thấy

        const targetUser = interaction.options.getUser('target');
        const amountToTake = interaction.options.getInteger('amount');

        if (targetUser.bot) {
            return interaction.editReply('❌ Không thể cướp tiền của bot!');
        }
        
        if (targetUser.id === ADMIN_ID) {
            return interaction.editReply('❌ Cướp của chính mình làm gì hả sếp?');
        }

        try {
            const targetData = await getUser(targetUser.id);
            const targetBalance = targetData.balance || 0;

            if (targetBalance <= 0) {
                return interaction.editReply(`❌ Tài khoản của **${targetUser.username}** đang khô máu (0 🪙). Không có gì để cướp!`);
            }

            // Nếu người ta không đủ số tiền muốn lấy, thì lấy sạch số tiền họ đang có
            const actualTaken = Math.min(amountToTake, targetBalance);

            // Trừ tiền nạn nhân
            await updateBalance(targetUser.id, -actualTaken);
            // Cộng tiền cho sếp
            await updateBalance(ADMIN_ID, actualTaken);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('💰 CƯỚP TIỀN THÀNH CÔNG 💰')
                .setDescription(`🐧 **Gunter** đã cầm phóng lợn chạy thục mạng tới nhà thằng ngu **${targetUser.username}**, lột sạch **${actualTaken.toLocaleString()} 🪙** và đem về cống nạp tận tay cho đại ca **${interaction.user.username}**!\n\n` +
                                `📉 Thằng ngu mất: **-${actualTaken.toLocaleString()} 🪙**\n` +
                                `📈 Đại ca **${interaction.user.username}** húp trọn: **+${actualTaken.toLocaleString()} 🪙**`)
                .setImage('https://i.pinimg.com/736x/87/4f/b5/874fb5ba4927cb0449da6ab54ff5f4bb.jpg');

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[ADMIN TAKE ERROR]', error);
            return interaction.editReply('❌ Đã xảy ra lỗi khi cố gắng cướp tiền.');
        }
    },
    
    // Hỗ trợ Prefix fake interaction
    async executePrefix(message, args, client) {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bố mày mới được xài lệnh này, mày tuổi tôm!');
        }

        if (args.length < 2) {
            return message.reply('❌ Sử dụng sai lệnh! Cú pháp chuẩn: `g!take @nguoi_dung <so_tien>`');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Mày phải tag một thằng để cướp chứ!');
        }

        const amountToTake = parseInt(args[1]);
        if (isNaN(amountToTake) || amountToTake <= 0) {
            return message.reply('❌ Số tiền nhập vào đéo hợp lệ!');
        }

        if (targetUser.bot) return message.reply('❌ Cướp bot làm đéo gì!');
        if (targetUser.id === ADMIN_ID) return message.reply('❌ Tự cướp tự ăn à?');

        const loadingMsg = await message.reply('⏳ Đang điều đàn em tới lột đồ...');

        try {
            const targetData = await getUser(targetUser.id);
            const targetBalance = targetData.balance || 0;

            if (targetBalance <= 0) {
                return loadingMsg.edit(`❌ Nạn nhân **${targetUser.username}** đéo có đồng nào trong túi, tha cho nó đi!`);
            }

            const actualTaken = Math.min(amountToTake, targetBalance);

            await updateBalance(targetUser.id, -actualTaken);
            await updateBalance(ADMIN_ID, actualTaken);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('💰 ĐẠI CA ĐÃ ĐI SĂN 💰')
                .setDescription(`🐧 **Gunter** đã cầm phóng lợn chạy thục mạng tới nhà thằng ngu **${targetUser.username}**, lột sạch **${actualTaken.toLocaleString()} 🪙** và đem về cống nạp tận tay cho đại ca **${message.author.username}**!\n\n` +
                                `📉 Thằng ngu mất: **-${actualTaken.toLocaleString()} 🪙**\n` +
                                `📈 Đại ca **${message.author.username}** húp trọn: **+${actualTaken.toLocaleString()} 🪙**`)
                .setImage('https://i.pinimg.com/736x/87/4f/b5/874fb5ba4927cb0449da6ab54ff5f4bb.jpg');

            return loadingMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('[PREFIX TAKE ERROR]', error);
            return loadingMsg.edit('❌ Gặp lỗi giang hồ cản địa rồi đại ca ơi!');
        }
    }
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { updateBalance, setJob } = require('../../utils/economyDB');
const { setUserRod } = require('../../utils/fishDB');

const ADMIN_ID = '586904255860965386';

// Ánh xạ độ bền cần câu mặc định theo Rod ID
const ROD_DURABILITY = {
    1: 15, // Tre
    2: 20, // Sắt
    3: 30, // Carbon
    4: 50, // Vàng
    5: 100 // Kim cương
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminset')
        .setDescription('[ADMIN] Ban phát tài sản, nghề nghiệp, cần câu cho User')
        .addUserOption(opt => opt.setName('target').setDescription('Người nhận').setRequired(true))
        .addIntegerOption(opt => opt.setName('money').setDescription('Số tiền muốn cho thêm (Cộng dồn)').setRequired(false))
        .addStringOption(opt => opt.setName('job').setDescription('ID nghề nghiệp muốn set (Ghi đè)').setRequired(false))
        .addIntegerOption(opt => opt.setName('rod').setDescription('ID cần câu muốn set (Ghi đè, 1-5)').setRequired(false)),

    async execute(interaction) {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ content: '❌ Bạn không phải là đấng tạo hóa!', flags: 64 });
        }

        await interaction.deferReply(); // Bỏ flags 64 để mọi người cùng thấy đấng ban phát

        const target = interaction.options.getUser('target');
        const addMoney = interaction.options.getInteger('money');
        const setJobId = interaction.options.getString('job');
        const setRodId = interaction.options.getInteger('rod');

        if (!addMoney && !setJobId && !setRodId) {
            return interaction.editReply('❌ Đấng phải nhập ít nhất 1 thứ để ban phát (money, job, rod)!');
        }

        let desc = `👑 **Đấng <@${ADMIN_ID}>** vừa ban phát hồng ân cho **${target.username}**:\n\n`;

        try {
            if (addMoney) {
                await updateBalance(target.id, addMoney);
                desc += `💰 **Tiền bạc:** +${addMoney.toLocaleString()} 🪙\n`;
            }
            if (setJobId) {
                await setJob(target.id, setJobId);
                desc += `💼 **Nghề nghiệp mới:** \`${setJobId}\`\n`;
            }
            if (setRodId) {
                const rodId = Math.max(1, Math.min(5, setRodId)); // Đảm bảo rod từ 1 đến 5
                const durability = ROD_DURABILITY[rodId] || 15;
                await setUserRod(target.id, rodId, durability);
                desc += `🎣 **Cần câu mới:** Cấp \`${rodId}\` (Độ bền: ${durability})\n`;
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🌟 HỒNG ÂN CỦA ĐẤNG 🌟')
                .setDescription(desc)
                .setThumbnail(target.displayAvatarURL());

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('[ADMIN GIVE ERROR]', err);
            return interaction.editReply('❌ Có lỗi xảy ra khi ban phát, đấng hãy thử lại!');
        }
    },

    async executePrefix(message, args, client) {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Bạn không phải là đấng tạo hóa!');
        }

        // g!adminset @user <type> <value>
        if (args.length < 3) {
            return message.reply('❌ Cú pháp sai! Cách dùng chuẩn:\n`g!adminset @user money 1000`\n`g!adminset @user job <tên_nghề>`\n`g!adminset @user rod <1-5>`');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Đấng quên tag người nhận rồi!');
        }

        const type = args[1]?.toLowerCase();
        const value = args[2];

        if (!type || !value) {
            return message.reply('❌ Thiếu loại tài sản hoặc giá trị!');
        }

        const loadingMsg = await message.reply('⏳ Đang truyền tống tài sản...');

        try {
            let desc = `👑 **Đấng <@${ADMIN_ID}>** vừa ban phát hồng ân cho **${targetUser.username}**:\n\n`;

            if (type === 'money' || type === 'tien') {
                const addMoney = parseInt(value);
                if (isNaN(addMoney)) return loadingMsg.edit('❌ Số tiền phải là một con số!');
                await updateBalance(targetUser.id, addMoney);
                desc += `💰 **Tiền bạc:** +${addMoney.toLocaleString()} 🪙\n`;
            } 
            else if (type === 'job' || type === 'nghe') {
                await setJob(targetUser.id, value);
                desc += `💼 **Nghề nghiệp mới:** \`${value}\`\n`;
            }
            else if (type === 'rod' || type === 'cancau') {
                const rodId = parseInt(value);
                if (isNaN(rodId) || rodId < 1 || rodId > 5) return loadingMsg.edit('❌ ID Cần câu phải từ 1 đến 5!');
                const durability = ROD_DURABILITY[rodId] || 15;
                await setUserRod(targetUser.id, rodId, durability);
                desc += `🎣 **Cần câu mới:** Cấp \`${rodId}\` (Độ bền: ${durability})\n`;
            } 
            else {
                return loadingMsg.edit('❌ Loại tài sản không hợp lệ! Hãy dùng: `money`, `job`, `rod`.');
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🌟 HỒNG ÂN CỦA ĐẤNG 🌟')
                .setDescription(desc)
                .setThumbnail(targetUser.displayAvatarURL());

            return loadingMsg.edit({ content: null, embeds: [embed] });
        } catch (err) {
            console.error('[PREFIX GIVE ERROR]', err);
            return loadingMsg.edit('❌ Đấng hết pháp lực, hãy thử lại sau!');
        }
    }
};

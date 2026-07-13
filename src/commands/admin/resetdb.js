const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/firebase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetdb')
        .setDescription('Reset dữ liệu tiền tệ của toàn bộ server (Chỉ dành cho Admin)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        // Chỉ cho phép Chủ Server (Owner) hoặc Admin cấp cao dùng lệnh này
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Bạn đéo đủ trình để dùng lệnh này!', flags: 64 });
        }

        await interaction.deferReply();

        try {
            const snapshot = await db.collection('users').get();
            
            if (snapshot.empty) {
                return interaction.editReply('✅ Database trống, không có dữ liệu nào để reset!');
            }
            
            const batches = [];
            let currentBatch = db.batch();
            let count = 0;

            snapshot.docs.forEach(doc => {
                currentBatch.update(doc.ref, {
                    balance: 500000,
                    job: null,
                    loanAmount: 0,
                    lastWork: null,
                    lastDaily: null,
                    given_today: 0,
                    tarot_count_today: 0
                });
                count++;
                
                if (count % 500 === 0) {
                    batches.push(currentBatch.commit());
                    currentBatch = db.batch();
                }
            });

            if (count % 500 !== 0) {
                batches.push(currentBatch.commit());
            }

            await Promise.all(batches);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ THIÊN THẠCH RƠI!')
                .setDescription(`Đã xóa sạch tài sản của toàn bộ server!\n\n` +
                                `✅ Số tài khoản bị ảnh hưởng: **${count}**\n` +
                                `💰 Số dư của tất cả mọi người đã trở về vạch xuất phát: **500,000 🪙**\n` +
                                `💀 Toàn bộ nợ nần đã được xóa. Bọn culi phải đi xin việc lại từ đầu!`);

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi reset DB:', error);
            return interaction.editReply('❌ Đã xảy ra lỗi khi reset database!');
        }
    },

    async executePrefix(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Bạn đéo đủ trình để dùng lệnh này!');
        }

        const replyMsg = await message.reply('⏳ Đang triệu hồi thiên thạch để xóa sạch mọi thứ...');
        
        const fakeInteraction = {
            memberPermissions: message.member.permissions,
            deferReply: async function() {},
            editReply: async function(options) {
                return await replyMsg.edit(options);
            },
            reply: async function(options) {
                return await message.reply(options);
            }
        };

        await this.execute(fakeInteraction);
    }
};

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const TICKET_CATEGORY_ID = null; // Tùy chọn, tạo thẳng vào channel cha nếu null
const SUPPORTER_ROLE_ID = '1524816270229242029';

// Map lưu trữ timer của mỗi ticket chờ xác nhận (ticketId -> timeoutObj)
const pendingTickets = new Map();

async function handleTicketButton(interaction) {
    const { customId, guild, user, member } = interaction;

    if (customId === 'ticket_create') {
        // Kiểm tra xem đã có ticket chưa bằng cách tìm kênh có chứa tên user
        // Tìm kênh bắt đầu bằng "ticket-" và kết thúc bằng "-username"
        const existingChannel = guild.channels.cache.find(c => c.name.startsWith('ticket-') && c.name.endsWith(`-${user.username.toLowerCase()}`));
        if (existingChannel) {
            return interaction.reply({ content: `❌ Bạn đã tạo ticket rồi: <#${existingChannel.id}>`, flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        try {
            // Lấy số thứ tự Ticket
            const { incrementTicketCount } = require('./configDB');
            const ticketNumber = await incrementTicketCount(guild.id);
            const formattedNumber = String(ticketNumber).padStart(4, '0'); // Ví dụ: 0001
            
            // Tìm hoặc tạo Danh mục (Category) TICKETS
            let ticketCategory = guild.channels.cache.find(c => c.name.toLowerCase() === 'tickets' && c.type === ChannelType.GuildCategory);
            if (!ticketCategory) {
                ticketCategory = await guild.channels.create({
                    name: 'TICKETS',
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }
                    ]
                });
            }

            // Tạo kênh Private trong Category
            const ticketChannel = await guild.channels.create({
                name: `ticket-${formattedNumber}-${user.username}`,
                type: ChannelType.GuildText,
                parent: ticketCategory.id,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // Ẩn với everyone
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, // Cho phép người tạo
                    { id: SUPPORTER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] } // Cho phép Role hỗ trợ
                ]
            });

            // Lấy danh sách Supporter
            await guild.members.fetch();
            const supporters = guild.members.cache.filter(m => m.roles.cache.has(SUPPORTER_ROLE_ID) && !m.user.bot);
            
            const options = supporters.map(s => ({
                label: s.user.username,
                description: 'Ticket Supporter',
                value: s.id
            })).slice(0, 25); // Limit 25

            if (options.length === 0) {
                options.push({ label: 'Không có ai online', value: 'none' });
            }

            const row1 = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_supporter_select')
                    .setPlaceholder('Chọn một Supporter để hỗ trợ bạn...')
                    .addOptions(options)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Đóng Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`🎫 Ticket #${formattedNumber} | ${user.username}`)
                .setDescription('Chào mừng bạn đến với kênh hỗ trợ riêng! Vui lòng chọn một Supporter từ menu bên dưới. \n*(Gunter AI cũng đang theo dõi kênh này, bạn có thể tag nó để hỏi nếu cần gấp)*');

            await ticketChannel.send({
                content: `<@${user.id}>`,
                embeds: [embed],
                components: [row1, row2]
            });

            return interaction.editReply({ content: `✅ Ticket của bạn đã được tạo tại: <#${ticketChannel.id}>` });

        } catch (error) {
            console.error('[TICKET CREATE]', error);
            return interaction.editReply({ content: '❌ Lỗi hệ thống khi tạo Ticket.' });
        }
    }

    if (customId === 'ticket_close') {
        const isSupporter = interaction.member.roles.cache.has(SUPPORTER_ROLE_ID) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = interaction.channel.name.startsWith('ticket-') && interaction.channel.name.endsWith(`-${user.username.toLowerCase()}`);
        
        if (!isSupporter && !isOwner) {
            return interaction.reply({ content: '❌ Bạn không có quyền đóng ticket này!', flags: 64 });
        }

        await interaction.reply({ content: '🔒 Ticket đang được đóng. Kênh sẽ bị khóa đối với bạn nhưng vẫn lưu trữ 2-3 ngày.' });

        try {
            // Lấy id của chủ ticket từ tên kênh (Cấu trúc: ticket-0001-username)
            const parts = interaction.channel.name.split('-');
            const ownerUsername = parts[parts.length - 1]; // Lấy phần cuối cùng
            const ticketNumber = parts[1]; // Lấy số ticket

            const owner = guild.members.cache.find(m => m.user.username.toLowerCase() === ownerUsername);
            
            if (owner) {
                // Khóa kênh với người dùng
                await interaction.channel.permissionOverwrites.edit(owner.id, {
                    ViewChannel: false
                });
            }
            
            // Đổi tên kênh
            await interaction.channel.setName(`closed-${ticketNumber}-${ownerUsername}`);
        } catch (e) {
            console.error('[TICKET CLOSE]', e);
        }
    }

    if (customId === 'ticket_supporter_confirm') {
        if (!interaction.member.roles.cache.has(SUPPORTER_ROLE_ID)) {
            return interaction.reply({ content: '❌ Bạn không phải Supporter!', flags: 64 });
        }

        const timeoutObj = pendingTickets.get(interaction.channelId);
        if (timeoutObj) {
            clearTimeout(timeoutObj);
            pendingTickets.delete(interaction.channelId);
        }

        await interaction.message.edit({ components: [] }); // Xóa nút xác nhận
        return interaction.reply({ content: `✅ **${interaction.user.username}** đã nhận hỗ trợ ticket này! Xin chào, tôi có thể giúp gì cho bạn?` });
    }
}

async function handleTicketSelect(interaction) {
    if (interaction.customId === 'ticket_supporter_select') {
        const supporterId = interaction.values[0];
        if (supporterId === 'none') {
            return interaction.reply({ content: 'Hiện tại không có Supporter nào.', flags: 64 });
        }

        const supporter = await interaction.guild.members.fetch(supporterId).catch(()=>null);
        if (!supporter) {
            return interaction.reply({ content: 'Supporter này đã bốc hơi.', flags: 64 });
        }

        // Tắt menu select hiện tại và thêm nút Xác Nhận cho Supporter
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_supporter_confirm')
                .setLabel('Xác Nhận Hỗ Trợ')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.update({ components: [interaction.message.components[1]] }); // Giữ lại nút Đóng ticket

        const msg = await interaction.channel.send({
            content: `🔔 <@${supporterId}>, bạn được <@${interaction.user.id}> gọi hỗ trợ! Hãy ấn nút bên dưới để xác nhận trong 15 phút.`,
            components: [row]
        });

        // 15 minutes timeout
        const timeout = setTimeout(async () => {
            try {
                // Xóa nút xác nhận
                await msg.edit({ content: `⌛ <@${supporterId}> đã không phản hồi sau 15 phút.`, components: [] });
                // Phục hồi lại menu (Bằng cách gửi lại tin nhắn mới)
                
                await interaction.guild.members.fetch();
                const supporters = interaction.guild.members.cache.filter(m => m.roles.cache.has(SUPPORTER_ROLE_ID) && !m.user.bot);
                
                const options = supporters.map(s => ({
                    label: s.user.username,
                    description: 'Ticket Supporter',
                    value: s.id
                })).slice(0, 25);
                
                if(options.length > 0) {
                    const selectRow = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ticket_supporter_select')
                            .setPlaceholder('Vui lòng chọn lại Supporter khác...')
                            .addOptions(options)
                    );
                    await interaction.channel.send({ content: 'Bạn có thể chọn người khác:', components: [selectRow] });
                }

            } catch(e) {}
            pendingTickets.delete(interaction.channelId);
        }, 15 * 60 * 1000);

        pendingTickets.set(interaction.channelId, timeout);
    }
}

async function initTicketPanel(client) {
    const TICKET_CHANNEL_ID = '1524816497397076251'; // Kênh ticket user yêu cầu
    try {
        const channel = await client.channels.fetch(TICKET_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        // Check if panel already exists
        const messages = await channel.messages.fetch({ limit: 10 });
        const hasPanel = messages.some(m => m.components?.length > 0 && m.components[0].components[0].customId === 'ticket_create');
        
        if (!hasPanel) {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🎫 TẠO TICKET HỖ TRỢ')
                .setDescription('Ấn vào nút bên dưới để mở một kênh nói chuyện riêng (Private) với đội ngũ Supporter của chúng tôi. Tại đó, Gunter AI cũng sẽ túc trực để hỗ trợ bạn nếu cần thiết.')
                .setFooter({ text: 'Hệ thống hỗ trợ tự động' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create')
                    .setLabel('Tạo Ticket 📩')
                    .setStyle(ButtonStyle.Primary)
            );

            await channel.send({ embeds: [embed], components: [row] });
            console.log('[TICKET] Đã tạo Ticket Panel tự động tại kênh:', TICKET_CHANNEL_ID);
        }
    } catch (e) {
        console.error('[TICKET] Lỗi khi tạo panel tự động:', e.message);
    }
}

module.exports = {
    handleTicketButton,
    handleTicketSelect,
    initTicketPanel
};

/**
 * fishshop.js – Shop cần câu và role vùng câu
 * /fishshop normal | limited | role | sell
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { RODS, ZONE_ROLES } = require('../../data/fishData');
const { getUser, updateBalance } = require('../../utils/economyDB');
const { setUserRod, getFishProfile, getZoneSetup, updateRodDurability } = require('../../utils/fishDB');

const PAGE_SIZE = 5;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishshop')
        .setDescription('🏪 Shop câu cá của Gunter')
        .addSubcommand(s => s.setName('normal').setDescription('Xem shop cần câu thường'))
        .addSubcommand(s => s.setName('limited').setDescription('Xem shop cần câu giới hạn'))
        .addSubcommand(s => s.setName('role').setDescription('Mua role vùng câu cá'))
        .addSubcommand(s => s.setName('myrod').setDescription('Xem cần câu hiện tại của bạn'))
        .addSubcommand(s => s.setName('repair').setDescription('Sửa cần câu bị gãy (phí = 30% giá gốc)')),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        // ─── Kiểm tra kênh shop ───
        const zones = await getZoneSetup(guildId);
        if (!zones.shopChannel) {
            return interaction.editReply('❌ Admin chưa setup kênh shop câu cá! Dùng lệnh `/fishsetup shop #kênh`.');
        }
        if (interaction.channelId !== zones.shopChannel) {
            return interaction.editReply(`❌ Shop câu cá chỉ hoạt động tại <#${zones.shopChannel}>!`);
        }

        if (sub === 'myrod') {
            const profile = await getFishProfile(userId);
            const rod = RODS.find(r => r.id === profile.rod) || RODS[0];
            const durText = profile.rodDurability === -1
                ? '🚨 **Gãy!** Dùng `/fishshop repair`'
                : profile.rodDurability !== null
                    ? `❤️ ${profile.rodDurability}/${rod.maxDurability}`
                    : '❤️ Vĩnh cửu';
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(profile.rodDurability === -1 ? 0xFF0000 : 0x1E90FF)
                    .setTitle(`${rod.emoji} Cần câu hiện tại: ${rod.name}`)
                    .setDescription(rod.desc)
                    .addFields(
                        { name: '🍀 Bonus May mắn', value: `+${rod.bonusLuck}%`, inline: true },
                        { name: '📏 Bonus Kích thước', value: `+${Math.round(rod.bonusSize * 100)}%`, inline: true },
                        { name: '⏱️ Bonus Thời gian', value: `+${rod.bonusTime}s`, inline: true },
                        { name: '💰 Giá', value: rod.price === 0 ? 'Miễn phí' : `${rod.price.toLocaleString()} 🪙`, inline: true },
                        { name: '❤️ Độ bền', value: durText, inline: true }
                    )]
            });
        }

        if (sub === 'repair') {
            const profile = await getFishProfile(userId);
            const rod = RODS.find(r => r.id === profile.rod) || RODS[0];

            if (profile.rodDurability !== -1) {
                return interaction.editReply(`✅ **${rod.emoji} ${rod.name}** của bạn vẫn đang hoạt động tốt (độ bền: ${profile.rodDurability ?? 'vĩnh cửu'}). Không cần sửa.`);
            }

            if (rod.price === 0) {
                await updateRodDurability(userId, rod.maxDurability);
                return interaction.editReply(`🔧 Đã sửa lại **${rod.emoji} ${rod.name}**! Miễn phí vì đây là cần miễn phí. Độ bền: ${rod.maxDurability}/${rod.maxDurability}.`);
            }

            const repairCost = Math.floor(rod.price * 0.3);
            const userData = await getUser(userId);
            if (userData.balance < repairCost) {
                return interaction.editReply(`❌ Không đủ tiền! Cần **${repairCost.toLocaleString()} 🪙** để sửa **${rod.emoji} ${rod.name}**. Số dư: ${userData.balance.toLocaleString()} 🪙.`);
            }

            await updateBalance(userId, -repairCost);
            await updateRodDurability(userId, rod.maxDurability);
            return interaction.editReply(`🔧 Đã sửa lại **${rod.emoji} ${rod.name}**! Tốn **${repairCost.toLocaleString()} 🪙**. Độ bền: ${rod.maxDurability}/${rod.maxDurability}.`);
        }

        if (sub === 'role') {
            const zones = await getZoneSetup(interaction.guildId);
            const member = interaction.member;
            const lines = [];

            for (const zr of ZONE_ROLES) {
                const roleId = zones[`zone${zr.zone}Role`];
                const hasRole = roleId && member.roles.cache.has(roleId);
                const rolePrices = { 1: 0, 2: 5000000, 3: 15000000 };
                const price = rolePrices[zr.zone];
                lines.push(`${zr.name} — **${price === 0 ? 'Miễn phí' : price.toLocaleString() + ' 🪙'}** ${hasRole ? '✅ Đã có' : ''}`);
            }

            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('🎭 Shop Role Vùng Câu')
                .setDescription(lines.join('\n\n'))
                .setFooter({ text: 'Dùng /fishsetup roles để tạo role (Admin)' });

            const row = new ActionRowBuilder().addComponents(
                ...ZONE_ROLES.map(zr => {
                    const roleId = zones[`zone${zr.zone}Role`];
                    const hasRole = roleId && member.roles.cache.has(roleId);
                    return new ButtonBuilder()
                        .setCustomId(`buyrole_${zr.zone}`)
                        .setLabel(zr.name)
                        .setStyle(hasRole ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(hasRole || !roleId);
                })
            );

            const msg = await interaction.editReply({ embeds: [embed], components: [row] });
            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000, filter: i => i.user.id === userId });

            collector.on('collect', async i => {
                const zoneNum = parseInt(i.customId.split('_')[1]);
                const rolePrices = { 1: 0, 2: 5000000, 3: 15000000 };
                const price = rolePrices[zoneNum];
                const roleId = zones[`zone${zoneNum}Role`];
                if (!roleId) return i.reply({ content: '❌ Role chưa được setup!', flags: 64 });

                const userData = await getUser(userId);
                if (userData.balance < price) return i.reply({ content: `❌ Không đủ tiền! Cần **${price.toLocaleString()} 🪙**`, flags: 64 });
                if (price > 0) await updateBalance(userId, -price);
                await i.member.roles.add(roleId).catch(() => {});
                await i.reply({ content: `✅ Đã mua role **${ZONE_ROLES[zoneNum - 1].name}**!`, flags: 64 });
            });

            return;
        }

        // Normal / Limited rods
        const isLimited = sub === 'limited';
        let rods;

        if (isLimited) {
            // Weighted random daily rotation – seed bằng ngày hiện tại
            const allLimited = RODS.filter(r => r.limited);
            const today = new Date();
            const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            // Seeded shuffle dựa trên ngày
            function seededRand(s) { let x = Math.sin(s) * 10000; return x - Math.floor(x); }
            const pool = [];
            for (const rod of allLimited) {
                const w = rod.shopWeight ?? 10;
                for (let i = 0; i < w; i++) pool.push(rod.id);
            }
            // Chọn 5 cần khác nhau theo weight
            const picked = [];
            const used = new Set();
            for (let i = 0; i < pool.length && picked.length < 5; i++) {
                const idx = Math.floor(seededRand(seed + i * 37) * pool.length);
                const rodId = pool[idx];
                if (!used.has(rodId)) { used.add(rodId); picked.push(RODS.find(r => r.id === rodId)); }
            }
            rods = picked.length >= 1 ? picked : allLimited.slice(0, 5);
        } else {
            rods = RODS.filter(r => !r.limited || r.id <= 10);
        }

        let page = 0;
        const totalPages = Math.ceil(rods.length / PAGE_SIZE);

        const buildRodEmbed = (p) => {
            const slice = rods.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
            const totalPages2 = Math.ceil(rods.length / PAGE_SIZE);
            const embed = new EmbedBuilder()
                .setColor(isLimited ? 0xFF6B6B : 0x1E90FF)
                .setTitle(isLimited ? '🌟 Shop Cần Giới Hạn (Daily Rotation)' : '🏪 Shop Cần Câu')
                .setFooter({ text: isLimited ? `Trang ${p + 1}/${totalPages2} | 🔄 Shop đổi hàng mỗi ngày — cần xịn hiếm xuất hiện hơn!` : `Trang ${p + 1}/${totalPages2} | Dùng nút Mua để mua cần` });

            for (const rod of slice) {
                embed.addFields({
                    name: `${rod.emoji} ${rod.name} — ${rod.price === 0 ? 'Miễn phí' : rod.price.toLocaleString() + ' 🪙'}`,
                    value: `${rod.desc}\n🍀+${rod.bonusLuck}% | 📏+${Math.round(rod.bonusSize*100)}% | ⏱️+${rod.bonusTime}s`,
                    inline: false
                });
            }
            return embed;
        };

        const buildRodRow = (p) => {
            const slice = rods.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
            const rows = [];
            const navRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId('shop_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages - 1)
            );
            const buyRow = new ActionRowBuilder().addComponents(
                ...slice.slice(0, 5).map(rod =>
                    new ButtonBuilder()
                        .setCustomId(`buyrod_${rod.id}`)
                        .setLabel(`Mua #${rod.id}`)
                        .setStyle(ButtonStyle.Success)
                )
            );
            rows.push(buyRow, navRow);
            return rows;
        };

        const msg = await interaction.editReply({ embeds: [buildRodEmbed(page)], components: buildRodRow(page) });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000, filter: i => i.user.id === userId });

        collector.on('collect', async i => {
            if (i.customId === 'shop_prev' && page > 0) { page--; return i.update({ embeds: [buildRodEmbed(page)], components: buildRodRow(page) }); }
            if (i.customId === 'shop_next' && page < totalPages - 1) { page++; return i.update({ embeds: [buildRodEmbed(page)], components: buildRodRow(page) }); }

            if (i.customId.startsWith('buyrod_')) {
                const rodId = parseInt(i.customId.split('_')[1]);
                const rod = RODS.find(r => r.id === rodId);
                if (!rod) return i.reply({ content: '❌ Cần không tồn tại!', flags: 64 });

                const userData = await getUser(userId);
                if (userData.balance < rod.price) return i.reply({ content: `❌ Không đủ tiền! Cần **${rod.price.toLocaleString()} 🪙**`, flags: 64 });

                if (rod.price > 0) await updateBalance(userId, -rod.price);
                await setUserRod(userId, rod.id, rod.maxDurability);
                await i.reply({ content: `✅ Đã mua và trang bị **${rod.emoji} ${rod.name}**!`, flags: 64 });
            }
        });

        collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
    }
};

/**
 * fishshop.js – Shop cần câu và role vùng câu
 * /fishshop normal | limited | role | sell
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { RODS, ZONE_ROLES } = require('../../data/fishData');
const { getUser, updateBalance } = require('../../utils/economyDB');
const { setUserRod, getFishProfile, getZoneSetup } = require('../../utils/fishDB');

const PAGE_SIZE = 5;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishshop')
        .setDescription('🏪 Shop câu cá của Gunter')
        .addSubcommand(s => s.setName('normal').setDescription('Xem shop cần câu thường'))
        .addSubcommand(s => s.setName('limited').setDescription('Xem shop cần câu giới hạn'))
        .addSubcommand(s => s.setName('role').setDescription('Mua role vùng câu cá'))
        .addSubcommand(s => s.setName('myrod').setDescription('Xem cần câu hiện tại của bạn')),

    async execute(interaction) {
        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (sub === 'myrod') {
            const profile = await getFishProfile(userId);
            const rod = RODS.find(r => r.id === profile.rod) || RODS[0];
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0x1E90FF)
                    .setTitle(`${rod.emoji} Cần câu hiện tại: ${rod.name}`)
                    .setDescription(rod.desc)
                    .addFields(
                        { name: '🍀 Bonus May mắn', value: `+${rod.bonusLuck}%`, inline: true },
                        { name: '📏 Bonus Kích thước', value: `+${Math.round(rod.bonusSize * 100)}%`, inline: true },
                        { name: '⏱️ Bonus Thời gian', value: `+${rod.bonusTime}s`, inline: true },
                        { name: '💰 Giá', value: rod.price === 0 ? 'Miễn phí' : `${rod.price.toLocaleString()} 🪙`, inline: true }
                    )]
            });
        }

        if (sub === 'role') {
            const zones = await getZoneSetup(interaction.guildId);
            const member = interaction.member;
            const lines = [];

            for (const zr of ZONE_ROLES) {
                const roleId = zones[`zone${zr.zone}Role`];
                const hasRole = roleId && member.roles.cache.has(roleId);
                const rolePrices = { 1: 0, 2: 500000, 3: 2000000 };
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
                const rolePrices = { 1: 0, 2: 500000, 3: 2000000 };
                const price = rolePrices[zoneNum];
                const roleId = zones[`zone${zoneNum}Role`];
                if (!roleId) return i.reply({ content: '❌ Role chưa được setup!', ephemeral: true });

                const userData = await getUser(userId);
                if (userData.balance < price) return i.reply({ content: `❌ Không đủ tiền! Cần **${price.toLocaleString()} 🪙**`, ephemeral: true });
                if (price > 0) await updateBalance(userId, -price);
                await i.member.roles.add(roleId).catch(() => {});
                await i.reply({ content: `✅ Đã mua role **${ZONE_ROLES[zoneNum - 1].name}**!`, ephemeral: true });
            });

            return;
        }

        // Normal / Limited rods
        const isLimited = sub === 'limited';
        const rods = RODS.filter(r => isLimited ? r.limited : !r.limited || r.id <= 10);
        let page = 0;
        const totalPages = Math.ceil(rods.length / PAGE_SIZE);

        const buildRodEmbed = (p) => {
            const slice = rods.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
            const embed = new EmbedBuilder()
                .setColor(isLimited ? 0xFF6B6B : 0x1E90FF)
                .setTitle(isLimited ? '🌟 Shop Cần Giới Hạn' : '🏪 Shop Cần Câu')
                .setFooter({ text: `Trang ${p + 1}/${totalPages} | Dùng nút Mua để mua cần` });

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
                if (!rod) return i.reply({ content: '❌ Cần không tồn tại!', ephemeral: true });

                const userData = await getUser(userId);
                if (userData.balance < rod.price) return i.reply({ content: `❌ Không đủ tiền! Cần **${rod.price.toLocaleString()} 🪙**`, ephemeral: true });

                if (rod.price > 0) await updateBalance(userId, -rod.price);
                await setUserRod(userId, rod.id);
                await i.reply({ content: `✅ Đã mua và trang bị **${rod.emoji} ${rod.name}**!`, ephemeral: true });
            }
        });

        collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
    }
};

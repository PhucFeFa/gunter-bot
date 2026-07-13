/**
 * fishsetup.js – Admin setup vùng câu cá
 * /fishsetup zone <1/2/3> <#channel>
 * /fishsetup roles  → tự tạo 3 role
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { setZoneSetup, getZoneSetup } = require('../../utils/fishDB');
const { ZONE_ROLES } = require('../../data/fishData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishsetup')
        .setDescription('⚙️ [ADMIN] Thiết lập hệ thống câu cá')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(s => s
            .setName('zone')
            .setDescription('Gán kênh cho vùng câu cá')
            .addIntegerOption(o => o.setName('zone').setDescription('Số vùng (1/2/3)').setRequired(true).addChoices(
                { name: '1 – Vịnh Làng Chài', value: 1 },
                { name: '2 – Đại Dương Sâu Thẳm', value: 2 },
                { name: '3 – Vùng Biển Tử Thần', value: 3 }
            ))
            .addChannelOption(o => o.setName('channel').setDescription('Kênh câu cá').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(s => s
            .setName('roles')
            .setDescription('Tự động tạo 3 role vùng câu cá cho server')
        )
        .addSubcommand(s => s
            .setName('shop')
            .setDescription('ℹ️ Gán kênh shop câu cá & thao tác shop')
            .addChannelOption(o => o.setName('channel').setDescription('Kênh shop câu cá').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(s => s
            .setName('view')
            .setDescription('Xem cấu hình hiện tại')
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        const guild = interaction.guild;

        if (sub === 'zone') {
            const zoneNum = interaction.options.getInteger('zone');
            const channel = interaction.options.getChannel('channel');
            const current = await getZoneSetup(guildId);
            current[`zone${zoneNum}Channel`] = channel.id;
            await setZoneSetup(guildId, current);
            return interaction.editReply(`✅ Đã gán vùng **${zoneNum}** vào kênh <#${channel.id}>!`);
        }

        if (sub === 'roles') {
            const current = await getZoneSetup(guildId);
            const created = [];

            for (const zr of ZONE_ROLES) {
                const existing = guild.roles.cache.find(r => r.name === zr.name);
                let role = existing;
                if (!role) {
                    role = await guild.roles.create({ name: zr.name, color: zr.color, reason: 'Gunter FishSetup' });
                }
                current[`zone${zr.zone}Role`] = role.id;
                created.push(`${zr.name} → <@&${role.id}>`);
            }

            await setZoneSetup(guildId, current);
            return interaction.editReply(`✅ Đã tạo/gán 3 role vùng câu:\n${created.join('\n')}`);
        }

        if (sub === 'shop') {
            const channel = interaction.options.getChannel('channel');
            const current = await getZoneSetup(guildId);
            current.shopChannel = channel.id;
            await setZoneSetup(guildId, current);
            return interaction.editReply(`✅ Đã gán kênh shop câu cá vào \u003c#${channel.id}\u003e!\n\nBot sẽ tự động gửi thông báo reset shop tại kênh này mỗi ngày (reset mỗi 12 giờ).`);
        }

        if (sub === 'view') {
            const zones = await getZoneSetup(guildId);
            const lines = [1, 2, 3].map(n => {
                const ch = zones[`zone${n}Channel`] ? `<#${zones[`zone${n}Channel`]}>` : '*chưa setup*';
                const ro = zones[`zone${n}Role`] ? `<@&${zones[`zone${n}Role`]}>` : '*chưa tạo*';
                return `**Vùng ${n}:** Kênh: ${ch} | Role: ${ro}`;
            });
            const shopCh = zones.shopChannel ? `<#${zones.shopChannel}>` : '*chưa setup*';
            lines.push(`**Shop:** ${shopCh}`);
            return interaction.editReply(lines.join('\n'));
        }
    }
};

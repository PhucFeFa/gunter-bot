/**
 * livegame.js – Admin command để bật/tắt Baccarat Live & Aviator Live
 * Usage:
 *   /livegame start baccarat [#channel]
 *   /livegame stop  baccarat
 *   /livegame start aviator  [#channel]
 *   /livegame stop  aviator
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const liveGameManager = require('../../utils/liveGameManager');
const { BaccaratLiveGame } = require('../../games/baccaratLive');
const { AviatorLiveGame } = require('../../games/aviatorLive');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('livegame')
        .setDescription('⚙️ [ADMIN] Bật/tắt game live ở một kênh')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName('start')
            .setDescription('Bật game live ở kênh chỉ định')
            .addStringOption(opt => opt
                .setName('game')
                .setDescription('Loại game')
                .setRequired(true)
                .addChoices(
                    { name: '🎴 Baccarat', value: 'baccarat' },
                    { name: '🚀 Aviator', value: 'aviator' }
                ))
            .addChannelOption(opt => opt
                .setName('channel')
                .setDescription('Kênh để chạy game (mặc định là kênh hiện tại)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('stop')
            .setDescription('Tắt game live')
            .addStringOption(opt => opt
                .setName('game')
                .setDescription('Loại game')
                .setRequired(true)
                .addChoices(
                    { name: '🎴 Baccarat', value: 'baccarat' },
                    { name: '🚀 Aviator', value: 'aviator' }
                ))
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const sub = interaction.options.getSubcommand();
        const game = interaction.options.getString('game');
        const guildId = interaction.guildId;

        if (sub === 'start') {
            if (liveGameManager.isRunning(guildId, game)) {
                return interaction.editReply(`❌ **${game}** đang chạy rồi! Dùng \`/livegame stop ${game}\` để tắt trước.`);
            }

            const channel = interaction.options.getChannel('channel') || interaction.channel;
            let instance;

            if (game === 'baccarat') {
                instance = new BaccaratLiveGame(channel, interaction.client, guildId);
            } else {
                instance = new AviatorLiveGame(channel, interaction.client, guildId);
            }

            const ok = liveGameManager.register(guildId, game, instance);
            if (!ok) return interaction.editReply(`❌ Không thể đăng ký game (có thể đã chạy).`);

            instance.start().catch(err => {
                console.error(`[LIVE GAME] ${game} lỗi:`, err);
                liveGameManager.unregister(guildId, game);
            });

            await interaction.editReply(`✅ **${game.charAt(0).toUpperCase() + game.slice(1)} Live** đã được bật tại <#${channel.id}>!`);

        } else if (sub === 'stop') {
            const instance = liveGameManager.get(guildId, game);
            if (!instance) {
                return interaction.editReply(`❌ **${game}** không đang chạy.`);
            }
            instance.stop();
            liveGameManager.unregister(guildId, game);
            await interaction.editReply(`🛑 **${game.charAt(0).toUpperCase() + game.slice(1)} Live** đã được tắt.`);
        }
    }
};

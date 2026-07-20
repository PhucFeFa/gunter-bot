/**
 * events/ready.js
 * Fires once when the bot successfully connects to Discord.
 */

const { Events, ActivityType } = require('discord.js');
const { db } = require('../utils/firebase');

module.exports = {
    name: Events.ClientReady,
    once: true,

    execute(client) {
        console.log(`[BOT] Logged in as: ${client.user.tag}`);
        console.log(`[BOT] Serving ${client.guilds.cache.size} guild(s).`);

        client.user.setPresence({
            activities: [{ name: 'Độ mixi', type: ActivityType.Streaming }],
            status: 'online',
        });

        // Khởi tạo Ticket Panel tự động
        const { initTicketPanel } = require('../utils/ticketSystem');
        initTicketPanel(client);

        const { initGameNotifier } = require('../tasks/gameNotifier');
        initGameNotifier(client);

        const { initRandomEvents } = require('../tasks/randomEvents');
        initRandomEvents(client);

        const { initRateUpManager } = require('../utils/rateManager');
        initRateUpManager(client);


        const updateServerStats = async () => {
            try {
                const snapshot = await db.collection('server_configs').where('feature_stats', '==', true).get();
                if (snapshot.empty) return;

                snapshot.forEach(async (doc) => {
                    const guildId = doc.id;
                    const config = doc.data();
                    const stats = config.stats_data;
                    if (!stats) return;

                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) return;

                    // Lấy chính xác memberCount từ Discord API để tránh kẹt cache
                    const updatedGuild = await guild.fetch();

                    // Cập nhật tổng thành viên (Cả người và bot)
                    if (stats.all_members_id) {
                        const allMemChan = updatedGuild.channels.cache.get(stats.all_members_id);
                        if (allMemChan && allMemChan.name !== `All members: ${updatedGuild.memberCount}`) {
                            await allMemChan.setName(`All members: ${updatedGuild.memberCount}`).catch(() => { });
                        }
                    }

                    // Cập nhật người thực (Không tính bot)
                    if (stats.members_id) {
                        const memChan = updatedGuild.channels.cache.get(stats.members_id);
                        const realMemberCount = updatedGuild.members.cache.filter(m => !m.user.bot).size;
                        if (memChan && memChan.name !== `Members: ${realMemberCount}`) {
                            await memChan.setName(`Members: ${realMemberCount}`).catch(() => { });
                        }
                    }

                    // Cập nhật từng Role
                    if (stats.roles) {
                        for (const [channelId, roleId] of Object.entries(stats.roles)) {
                            const roleChan = updatedGuild.channels.cache.get(channelId);
                            const role = updatedGuild.roles.cache.get(roleId);
                            if (roleChan && role) {
                                const roleCount = updatedGuild.members.cache.filter(m => m.roles.cache.has(role.id)).size;
                                const newName = `${role.name}: ${roleCount}`;
                                if (roleChan.name !== newName) {
                                    await roleChan.setName(newName).catch(() => { });
                                }
                            }
                        }
                    }
                });
            } catch (err) {
                console.error('[STATS] Lỗi khi cập nhật Server Stats:', err.message);
            }
        };

        // Chạy ngay 1 lần lúc mới khởi động
        updateServerStats();

        // Và cập nhật ngầm mỗi 15 phút (900000ms)
        setInterval(updateServerStats, 15 * 60 * 1000);
    },
};

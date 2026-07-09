/**
 * events/voiceStateUpdate.js
 * Quản lý tính năng Join-to-Create
 */

const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('../utils/configDB');

// Bộ nhớ tạm lưu lại ID của các phòng được tạo ra tự động
const tempChannels = new Set();
// Bộ nhớ tạm lưu thời gian tham gia Voice của mỗi user (để tính leaderboard)
const voiceSessions = new Map();

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,

    async execute(oldState, newState, client) {
        // --- THEO DÕI THỐNG KÊ VOICE ---
        // Người dùng VỪA tham gia kênh voice (trước đó không ở kênh nào)
        if (!oldState.channelId && newState.channelId) {
            voiceSessions.set(newState.id, Date.now());
        }
        // Người dùng RỜI KHỎI kênh voice (hiện tại không ở kênh nào)
        else if (oldState.channelId && !newState.channelId) {
            if (voiceSessions.has(oldState.id)) {
                const joinTime = voiceSessions.get(oldState.id);
                const duration = Date.now() - joinTime;
                
                const { addVoiceTime } = require('../utils/economyDB');
                addVoiceTime(oldState.id, duration).catch(e => console.error('[STATS] Lỗi cộng giờ voice:', e));
                
                voiceSessions.delete(oldState.id);
            }
        }

        // Lấy config cho J2C
        const config = await getConfig(newState.guild.id);
        if (!config.feature_j2c || !config.j2c_channel_id) return;

        const masterChannelId = config.j2c_channel_id;

        // --- NGƯỜI DÙNG THAM GIA KÊNH MỚI ---
        if (newState.channelId === masterChannelId) {
            const member = newState.member;
            const guild = newState.guild;

            try {
                // Lấy thông tin kênh gốc để lấy vị trí và danh mục (Category)
                const masterChannel = newState.channel;

                // Tạo kênh Voice mới
                const newChannel = await guild.channels.create({
                    name: ` ${member.user.username}'s Room`,
                    type: ChannelType.GuildVoice,
                    parent: masterChannel.parentId, // Cùng thư mục với kênh gốc
                    permissionOverwrites: [
                        {
                            // Cho phép mọi người nhìn thấy
                            id: guild.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            // Trao toàn quyền (Full Perms) cho chủ phòng
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.ManageRoles, // Cho phép chỉnh sửa quyền của phòng
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.CreateInstantInvite,
                                PermissionFlagsBits.PrioritySpeaker,
                            ],
                        },
                    ],
                });

                // Lưu vào bộ nhớ tạm
                tempChannels.add(newChannel.id);

                // Kéo người dùng từ kênh gốc xuống kênh vừa tạo
                await member.voice.setChannel(newChannel);

            } catch (error) {
                console.error('[J2C] Lỗi khi tạo phòng Voice:', error);
            }
        }

        // --- NGƯỜI DÙNG RỜI KHỎI KÊNH ---
        // Nếu trước đó họ ở trong một kênh, và kênh đó là kênh tạm thời
        if (oldState.channelId && tempChannels.has(oldState.channelId)) {
            const channel = oldState.channel;

            // Nếu kênh đó hiện tại trống không có ai
            if (channel && channel.members.size === 0) {
                try {
                    await channel.delete('Phòng Join-to-Create trống');
                    tempChannels.delete(oldState.channelId);
                } catch (error) {
                    console.error('[J2C] Lỗi khi xóa phòng Voice:', error);
                }
            }
        }
    },
};

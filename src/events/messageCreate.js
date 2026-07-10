/**
 * events/messageCreate.js
 * ============================================================
 * Handles all message-based features:
 *  1. Role member listing (Owner/Admin only + role mention)
 *  2. TikTok auto-downloader
 * ============================================================
 */

const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('../utils/configDB');
const { handleGeminiChat } = require('../utils/geminiChat');
const { handleGroqChat } = require('../utils/groqChat');
const { getResponses } = require('../utils/autoResponderDB');

const autoResponderCooldowns = new Map();

// ─── Tối ưu Tải Video: Mạng Xã Hội ──────────────────────────────
const TIKTOK_REGEX = /https?:\/\/(www\.)?(vt\.tiktok\.com|tiktok\.com)\S+/gi;
const IG_REGEX = /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\S+/gi;
const FB_REGEX = /https?:\/\/(www\.)?(facebook\.com|fb\.watch|fb\.gg)\S+/gi;

const TIKWM_API = 'https://www.tikwm.com/api/';

// ────────────────────────────────────────────────────────────

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot) return;
        if (!message.guild) return;

        // BẢO MẬT: Chỉ hoạt động trên 1 server duy nhất
        if (message.guild.id !== process.env.DISCORD_GUILD_ID) return;

        // --- THEO DÕI THỐNG KÊ NHẮN TIN ---
        const { incrementMsgCount } = require('../utils/economyDB');
        incrementMsgCount(message.author.id).catch(e => console.error('[STATS] Lỗi đếm tin nhắn:', e));

        const config = await getConfig(message.guild.id);
        const prefix = config.prefix || 'g!';

        // ─── Xử lý Prefix Commands ─────────────────────────────
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = client.commands.get(commandName);
            if (command) {
                try {
                    if (command.executePrefix) {
                        await command.executePrefix(message, args, client);
                    } else {
                        // Fake Interaction cho các lệnh Slash gốc
                        const fakeInteraction = {
                            isCommand: true,
                            isChatInputCommand: () => true,
                            commandName,
                            guildId: message.guild.id,
                            guild: message.guild,
                            channel: message.channel,
                            channelId: message.channel.id,
                            user: message.author,
                            member: message.member,
                            client: client,
                            deferred: false,
                            replied: false,
                            deferReply: async function() { this.deferred = true; await message.channel.sendTyping(); },
                            reply: async function(options) { 
                                this.replied = true;
                                if (typeof options === 'string') return await message.reply(options);
                                return await message.reply(options);
                            },
                            editReply: async function(options) {
                                if (typeof options === 'string') return await message.reply(options);
                                return await message.reply(options);
                            },
                            followUp: async function(options) {
                                if (typeof options === 'string') return await message.reply(options);
                                return await message.reply(options);
                            },
                            options: {
                                getMember: (name) => message.mentions.members.first(),
                                getUser: (name) => message.mentions.users.first(),
                                getString: (name) => args.join(' ') || null,
                                getInteger: (name) => parseInt(args[0]) || null,
                                getNumber: (name) => parseFloat(args[0]) || null,
                                getBoolean: (name) => null,
                                getRole: (name) => message.mentions.roles.first(),
                                getChannel: (name) => message.mentions.channels.first()
                            }
                        };
                        await command.execute(fakeInteraction);
                    }
                } catch (error) {
                    console.error(`[PREFIX CMD] Lỗi khi chạy lệnh ${commandName}:`, error);
                    await message.reply('❌ Có lỗi xảy ra khi thực hiện lệnh này (Có thể lệnh này cần tham số phức tạp của Slash Command).');
                }
                return; // Nếu là prefix command hợp lệ thì dừng, không xử lý các tính năng dưới
            }
        }

        // ─── Feature 1: Role Member Listing ────────────────────
        if (config.feature_role_list) {
            await handleRoleListing(message);
        }

        // ─── Feature 2: All-in-One Downloader (TikTok, FB, IG) ───
        if (config.feature_tiktok) {
            const hasTikTok = message.content.match(TIKTOK_REGEX);
            const hasIg = message.content.match(IG_REGEX);
            const hasFb = message.content.match(FB_REGEX);
            
            if (hasTikTok) await handleTikTok(message, hasTikTok);
            else if (hasIg) await handleInstagram(message, hasIg);
            else if (hasFb) await handleFacebook(message, hasFb);
        }

        // ─── Feature 3: Chabot AI (Gemini) ─────────────────────
        const AI_CHANNEL_ID = '1524806887454019795';

        // Nếu tin nhắn nằm trong kênh AI, bot sẽ tự động trả lời mọi tin nhắn (không cần tag)
        if (message.channel.id === AI_CHANNEL_ID) {
            await handleGeminiChat(message, client);
        }

        // ─── Feature 4: Chabot AI Ticket (Groq) ─────────────────────
        // Nếu trong kênh ticket và có tag bot, sử dụng não phụ Groq để hỗ trợ
        if (message.channel.name && message.channel.name.startsWith('ticket-')) {
            if (message.mentions.has(client.user)) {
                await handleGroqChat(message, client);
            }
        }

        // ─── Feature 5: Auto-Responder (Tự động trả lời theo từ khóa) ───
        await handleAutoResponder(message);
    },
};

// ════════════════════════════════════════════════════════════
// FEATURE 5: Auto-Responder
// ════════════════════════════════════════════════════════════
async function handleAutoResponder(message) {
    if (message.author.bot) return;

    const rules = getResponses();
    if (!rules || rules.length === 0) return;

    const content = message.content.toLowerCase();

    for (const rule of rules) {
        // Kiểm tra kênh áp dụng
        if (rule.channels && rule.channels.length > 0) {
            if (!rule.channels.includes(message.channel.id)) continue;
        }

        let isMatch = false;

        if (rule.match_type === 'exact') {
            isMatch = rule.trigger.some(t => content === t.toLowerCase());
        } else if (rule.match_type === 'contains') {
            isMatch = rule.trigger.some(t => content.includes(t.toLowerCase()));
        } else if (rule.match_type === 'regex') {
            try {
                // Regex chỉ cần 1 trigger string đầu tiên
                const regex = new RegExp(rule.trigger[0], 'i');
                isMatch = regex.test(message.content); // Test với tin nhắn gốc (giữ hoa/thường)
            } catch (e) {
                console.error(`[AUTORESPONSE] Regex lỗi ở rule ID ${rule.id}:`, e);
            }
        }

        if (isMatch) {
            // Kiểm tra Cooldown
            const cooldownKey = `${rule.id}_${message.author.id}`;
            const cooldownTime = (rule.cooldown || 5) * 1000;
            const now = Date.now();

            if (autoResponderCooldowns.has(cooldownKey)) {
                const expirationTime = autoResponderCooldowns.get(cooldownKey) + cooldownTime;
                if (now < expirationTime) {
                    continue; // Đang trong cooldown, bỏ qua rule này
                }
            }

            autoResponderCooldowns.set(cooldownKey, now);

            console.log(`[AUTORESPONSE] Kích hoạt rule \`${rule.id}\` bởi user ${message.author.tag} (${message.author.id})`);
            
            // Xóa bộ nhớ cooldown sau khi hết hạn để tránh rò rỉ RAM
            setTimeout(() => autoResponderCooldowns.delete(cooldownKey), cooldownTime);

            await message.reply(rule.response);
            break; // Chỉ thực thi 1 rule đầu tiên match được để tránh spam nhiều tin nhắn
        }
    }
}

// ════════════════════════════════════════════════════════════
// FEATURE 1: List members of a mentioned role
// Triggered when: message has a role mention AND author is
// the Guild Owner OR has Administrator permission.
// ════════════════════════════════════════════════════════════
async function handleRoleListing(message) {
    // Only process if there's at least one role mention
    if (message.mentions.roles.size === 0) return;

    // Check permissions: must be server owner or have Administrator
    const isOwner = message.guild.ownerId === message.author.id;
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) return;

    const role = message.mentions.roles.first();

    // Lấy toàn bộ danh sách thành viên của server về bộ nhớ tạm (Cache)
    await message.guild.members.fetch();
    
    // Lọc ra những người có chứa role.id này
    const membersWithRole = message.guild.members.cache.filter(m => m.roles.cache.has(role.id));

    if (membersWithRole.size === 0) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF6B6B)
                    .setTitle(`👥 Role: ${role.name}`)
                    .setDescription('Không có thành viên nào trong role này.')
                    .setTimestamp(),
            ],
        });
    }

    // Build member list, split into chunks to avoid 4096 char limit
    const memberLines = membersWithRole.map(m =>
        `${m.user.bot ? '🤖' : '👤'} **${m.user.tag}** (\`${m.id}\`)`
    );

    const CHUNK_SIZE = 30; // lines per embed
    const chunks = [];
    for (let i = 0; i < memberLines.length; i += CHUNK_SIZE) {
        chunks.push(memberLines.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
        const embed = new EmbedBuilder()
            .setColor(role.color || 0x5865F2)
            .setTitle(i === 0 ? `👥 Thành viên trong @${role.name} (${membersWithRole.size})` : `👥 @${role.name} (tiếp theo)`)
            .setDescription(chunks[i].join('\n'))
            .setFooter({ text: `Trang ${i + 1}/${chunks.length}` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}

// ════════════════════════════════════════════════════════════
// FEATURE 2: Video Downloader (TikTok, IG, FB)
// ════════════════════════════════════════════════════════════
async function handleTikTok(message, matches) {
    // Để cho nhanh bằng Keto, xoá sạch phần tải API lằng nhằng và dùng trực tiếp vxtiktok
    const userContent = message.content.replace(TIKTOK_REGEX, '').trim();
    let finalUrls = matches.map(u => {
        let url = u.replace('tiktok.com', 'tnktok.com');
        if (!url.includes('tnktok.com')) url = url.replace('vt.tiktok.com', 'vt.tnktok.com');
        return url;
    });

    try {
        await message.channel.send(`🎵 **TikTok từ ${message.author}**${userContent ? `\n💬: *${userContent}*` : ''}\n${finalUrls.join('\n')}`);
        await message.delete().catch(()=>{});
    } catch (err) {
        console.error('TikTok Send Error:', err);
    }
}

async function handleInstagram(message, matches) {
    const userContent = message.content.replace(IG_REGEX, '').trim();
    let finalUrls = matches.map(u => u.replace('instagram.com', 'ddinstagram.com'));
    
    try {
        await message.channel.send(`📸 **Instagram từ ${message.author}**${userContent ? `\n💬: *${userContent}*` : ''}\n${finalUrls.join('\n')}`);
        await message.delete().catch(()=>{});
    } catch (err) {
        console.error('IG Send Error:', err);
    }
}

async function handleFacebook(message, matches) {
    // Không có vx facebook xịn, báo lỗi
    await message.reply('❌ Lỗi: Facebook hiện tại bị khóa API tải xuống, tính năng này đang bảo trì!');
}

async function resolveRedirect(url) {
    return url; // Không cần resolve nữa vì vxtiktok đã tự lo
}



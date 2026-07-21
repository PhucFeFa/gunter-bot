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
const { getResponses } = require('../utils/autoResponderDB');
const liveGameManager = require('../utils/liveGameManager');
const beggarManager = require('../utils/beggarManager');
const antiSpamManager = require('../utils/antiSpamManager');
const { isSpamming } = require('../utils/spamHandler');

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
        // Ignore bots
        if (message.author.bot) return;

        // --- DM SPAM STOPPER ---
        if (!message.guild) {
            if (isSpamming(message.author.id)) {
                await message.reply('Muốn xin tha thì ra kênh server mà chat với tao! Nhắn tin riêng đéo có tác dụng đâu con gà! 🐧').catch(() => {});
            }
            return;
        }

        // BẢO MẬT: Chỉ hoạt động trên 1 server duy nhất
        if (message.guild.id !== process.env.DISCORD_GUILD_ID) return;

        // --- ANTI SPAM ---
        const isSpam = await antiSpamManager.handleMessage(message);
        if (isSpam) return; // Dừng nếu đã bắt quả tang spam

        // --- THEO DÕI THỐNG KÊ NHẮN TIN ---
        const { checkCooldown } = require('../utils/cooldown');
        const { incrementMsgCount } = require('../utils/economyDB');
        incrementMsgCount(message.author.id).catch(e => console.error('[STATS] Lỗi đếm tin nhắn:', e));

        // --- SỰ KIỆN XIN TIỀN BỰA ---
        try {
            await beggarManager.handleMessage(message);
        } catch (error) {
            console.error('[BEGGAR] Lỗi xử lý sự kiện xin tiền:', error);
        }

        const config = await getConfig(message.guild.id);
        const prefix = config.prefix || 'g!';

        // ─── Xử lý Prefix Commands ─────────────────────────────
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // --- GLOBAL ANTI-SPAM ---
            if (!checkCooldown(message.author.id, 2000)) { // 2s cooldown
                return message.reply('⏳ Từ từ thôi đại ca! Lệnh chạy không kịp thở rồi, chờ 2 giây nhé!');
            }

            const command = client.commands.get(commandName);
            if (command) {
                // --- KIỂM TRA CHẶN KÊNH (IGNORE CHANNEL) ---
                const ignoredChannels = config.ignored_channels || [];
                const isAdmin = message.member.permissions.has('Administrator');
                if (ignoredChannels.includes(message.channel.id) && !isAdmin) {
                    // Xóa tin nhắn lệnh của người dùng để tránh rác kênh
                    setTimeout(() => message.delete().catch(() => {}), 2000);
                    const warnMsg = await message.reply('🚫 Kênh này đã bị Admin cấm dùng bot!');
                    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
                    return;
                }

                try {
                    if (command.executePrefix) {
                        await command.executePrefix(message, args, client);
                    } else {
                        // Fake Interaction cho các lệnh Slash gốc
                        // Gửi placeholder trước để có message object dùng cho editReply
                        let sentMsg = null;

                        // Build options mapping dựa trên slash command data (nếu có)
                        // Mỗi slash option được map theo thứ tự khai báo trong command.data
                        const optionNames = [];
                        if (command.data && command.data.options) {
                            for (const opt of command.data.options) {
                                optionNames.push(opt.toJSON ? opt.toJSON().name : opt.name);
                            }
                        }

                        // Xây dựng map: tên option → giá trị từ args
                        // Mentions được ưu tiên cho user/member options
                        const argsWithoutMention = args.filter(a => !a.startsWith('<@') && !a.startsWith('<#'));

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
                            deferReply: async function() {
                                this.deferred = true;
                                // Gửi placeholder để lấy sentMsg cho editReply
                                sentMsg = await message.reply('⏳ Đang xử lý...');
                            },
                            reply: async function(options) {
                                this.replied = true;
                                if (typeof options === 'string') {
                                    sentMsg = await message.reply(options);
                                    return sentMsg;
                                }
                                const opts = { ...options };
                                delete opts.ephemeral;
                                delete opts.flags;
                                sentMsg = await message.reply(opts);
                                return sentMsg;
                            },
                            editReply: async function(options) {
                                const payload = typeof options === 'string' 
                                    ? { content: options, embeds: [], components: [] } 
                                    : { content: options.content || null, ...options };
                                delete payload.ephemeral;
                                delete payload.flags;
                                // Nếu đã có sentMsg thì edit, không thì reply mới
                                if (sentMsg && typeof sentMsg.edit === 'function') {
                                    try {
                                        sentMsg = await sentMsg.edit(payload);
                                        return sentMsg;
                                    } catch (e) {
                                        console.error('[FAKE INTERACTION] Lỗi khi edit tin nhắn:', e.message);
                                        // Message bị xóa → reply mới
                                        sentMsg = await message.reply(payload).catch(() => null);
                                        return sentMsg;
                                    }
                                }
                                sentMsg = await message.reply(payload);
                                return sentMsg;
                            },
                            followUp: async function(options) {
                                if (typeof options === 'string') return await message.reply(options);
                                const opts = { ...options };
                                delete opts.ephemeral;
                                delete opts.flags;
                                return await message.reply(opts);
                            },
                            options: {
                                _rawArgs: args,
                                _optionNames: optionNames,
                                getMember: (name) => message.mentions.members.first() || null,
                                getUser: (name) => message.mentions.users.first() || null,
                                getRole: (name) => message.mentions.roles.first() || null,
                                getChannel: (name) => message.mentions.channels.first() || null,
                                getBoolean: (name) => null,
                                getSubcommand: () => args[0] ? args[0].toLowerCase() : null,
                                getString: (name) => {
                                    // Nếu có option names mapping, trả đúng arg theo index
                                    const idx = optionNames.indexOf(name);
                                    if (idx >= 0) {
                                        // Arg cuối cùng (hoặc sau mentions) gom hết phần còn lại
                                        const cleanArgs = argsWithoutMention;
                                        if (idx === optionNames.length - 1) {
                                            // Option cuối → gom hết args còn lại
                                            return cleanArgs.slice(idx).join(' ') || null;
                                        }
                                        return cleanArgs[idx] || null;
                                    }
                                    // Fallback: trả toàn bộ args
                                    return argsWithoutMention.join(' ') || null;
                                },
                                getInteger: (name) => {
                                    const idx = optionNames.indexOf(name);
                                    const cleanArgs = argsWithoutMention;
                                    const val = idx >= 0 ? parseInt(cleanArgs[idx]) : parseInt(cleanArgs[0]);
                                    return isNaN(val) ? null : val;
                                },
                                getNumber: (name) => {
                                    const idx = optionNames.indexOf(name);
                                    const cleanArgs = argsWithoutMention;
                                    const val = idx >= 0 ? parseFloat(cleanArgs[idx]) : parseFloat(cleanArgs[0]);
                                    return isNaN(val) ? null : val;
                                }
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

            // ─── Live Game Commands (g!bet, g!cashout) ─────────────
            if (commandName === 'bet') {
                const liveGame = liveGameManager.getByChannel(message.channel.id);
                if (liveGame) {
                    if (liveGame.gameType === 'baccarat') {
                        // g!bet banker/player/tie <amount>
                        const side = (args[0] || '').toLowerCase();
                        const rawAmt = args[1] || '';
                        const userData = await require('../utils/economyDB').getUser(message.author.id);
                        const balance = userData.balance;
                        const amount = rawAmt.toLowerCase() === 'all' ? balance : parseInt(rawAmt);
                        await liveGame.placeBet(message, side, amount);
                    } else if (liveGame.gameType === 'aviator') {
                        // g!bet <amount>
                        const rawAmt = (args[0] || '').toLowerCase();
                        const userData = await require('../utils/economyDB').getUser(message.author.id);
                        const balance = userData.balance;
                        const amount = rawAmt === 'all' ? balance : parseInt(rawAmt);
                        await liveGame.placeBet(message, amount);
                    }
                    return;
                }
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
        const AI_CHANNEL_ID = config.ai_channel_id || process.env.AI_CHANNEL_ID;

        const isVictim = isSpamming(message.author.id);
        const isMentioned = message.mentions.has(client.user);
        const isReplyToBot = message.reference && (() => {
            try {
                const refMsg = message.channel.messages.cache.get(message.reference.messageId);
                return refMsg && refMsg.author.id === client.user.id;
            } catch { return false; }
        })();

        // Nếu đang bị spam DM: bot tự trả lời mọi tin nhắn để nghe xin tha
        if (isVictim) {
            await handleGeminiChat(message, client);
        }
        // Kênh AI chuyên dụng: Trả lời mọi tin nhắn (không cần tag)
        else if (AI_CHANNEL_ID && message.channel.id === AI_CHANNEL_ID) {
            await handleGeminiChat(message, client);
        }
        // Ở các kênh khác: Chỉ trả lời khi được tag hoặc reply
        else if (isMentioned || isReplyToBot) {
            await handleGeminiChat(message, client);
        }

        // Kênh Ticket (được xử lý chung bởi isMentioned ở trên)

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
        await message.channel.send(`${userContent ? `💬: *${userContent}*\n` : ''}${finalUrls.join('\n')}`);
        await message.delete().catch(()=>{});
    } catch (err) {
        console.error('TikTok Send Error:', err);
    }
}

async function handleInstagram(message, matches) {
    const userContent = message.content.replace(IG_REGEX, '').trim();
    let finalUrls = matches.map(u => u.replace('instagram.com', 'ddinstagram.com'));
    
    try {
        await message.channel.send(`${userContent ? `💬: *${userContent}*\n` : ''}${finalUrls.join('\n')}`);
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



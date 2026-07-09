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

// ─── TikTok URL Pattern ───────────────────────────────────────
const TIKTOK_REGEX = /https?:\/\/(www\.)?(vt\.tiktok\.com|tiktok\.com)\S+/gi;

// ─── TikWM API ────────────────────────────────────────────────
// Free, no API key required. Returns MP4 without watermark.
const TIKWM_API = 'https://www.tikwm.com/api/';

// ─── Temp directory for video files ──────────────────────────
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

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

        // ─── Feature 2: TikTok Downloader ──────────────────────
        if (config.feature_tiktok) {
            await handleTikTok(message);
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
    },
};

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
// FEATURE 2: TikTok Auto-Downloader via TikWM API
// Detects TikTok links, fetches the no-watermark MP4,
// downloads it locally, uploads to Discord, then reacts.
// ════════════════════════════════════════════════════════════
async function handleTikTok(message) {
    const matches = message.content.match(TIKTOK_REGEX);
    if (!matches) return;

    // React with loading emoji immediately
    await message.react('⏳').catch(() => {});

    for (const url of matches) {
        try {
            // Step 1: Resolve the URL (handles vt.tiktok.com shortlinks)
            const resolvedUrl = await resolveRedirect(url);

            // Step 2: Call TikWM API
            const apiRes = await axios.post(TIKWM_API, new URLSearchParams({ url: resolvedUrl }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000,
            });

            const data = apiRes.data?.data;
            if (!apiRes.data?.code === 0 || !data) {
                throw new Error(apiRes.data?.msg ?? 'TikWM returned no data');
            }

            const videoUrl  = data.play;       // No-watermark MP4 URL
            const title     = data.title ?? 'TikTok Video';
            const author    = data.author?.nickname ?? 'Unknown';
            const likes     = Number(data.digg_count ?? 0).toLocaleString();
            const comments  = Number(data.comment_count ?? 0).toLocaleString();

            // Step 3: Download MP4 to temp/
            const fileName  = `tiktok_${Date.now()}.mp4`;
            const filePath  = path.join(TEMP_DIR, fileName);
            await downloadFile(videoUrl, filePath);

            // Step 4: Check file size (Discord limit: 8MB for non-boosted servers)
            const stats = fs.statSync(filePath);
            const fileSizeMB = stats.size / (1024 * 1024);

            const embed = new EmbedBuilder()
                .setColor(0x000000)
                .setAuthor({ name: `TikTok by @${author}`, iconURL: 'https://i.imgur.com/TikTok.png' })
                .setTitle(title.length > 256 ? title.slice(0, 253) + '...' : title)
                .addFields(
                    { name: '❤️ Likes', value: likes, inline: true },
                    { name: '💬 Comments', value: comments, inline: true },
                )
                .setFooter({ text: `Tải bởi Gunter Bot • ${fileSizeMB.toFixed(2)} MB` })
                .setTimestamp();

            if (fileSizeMB <= 8) {
                // Send video as file attachment
                await message.channel.send({
                    content: `🎵 Video TikTok từ **${message.author}**`,
                    embeds: [embed],
                    files: [{ attachment: filePath, name: fileName }],
                });
            } else {
                // File too large - send direct link instead
                embed.setDescription(`📦 Video quá lớn (${fileSizeMB.toFixed(2)} MB) để upload.\n[📥 Bấm để tải xuống](${videoUrl})`);
                await message.channel.send({ embeds: [embed] });
            }

            // Cleanup
            fs.unlinkSync(filePath);

            // React success
            await message.reactions.cache.get('⏳')?.remove().catch(() => {});
            await message.react('✅').catch(() => {});

        } catch (err) {
            console.error('[TIKTOK] Error:', err.message);
            await message.reactions.cache.get('⏳')?.remove().catch(() => {});
            await message.react('❌').catch(() => {});
            await message.reply(`❌ Không tải được TikTok: \`${err.message}\``);
        }
    }
}

/**
 * Follow HTTP redirects to resolve a shortened URL.
 * @param {string} url
 * @returns {Promise<string>} Final resolved URL
 */
async function resolveRedirect(url) {
    try {
        const res = await axios.get(url, {
            maxRedirects: 10,
            timeout: 8000,
            validateStatus: s => s < 400,
        });
        return res.request.res?.responseUrl ?? url;
    } catch {
        return url;
    }
}

/**
 * Stream-download a file from url to dest path.
 * @param {string} url
 * @param {string} dest
 * @returns {Promise<void>}
 */
function downloadFile(url, dest) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 60000 });
            const writer = fs.createWriteStream(dest);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        } catch (err) {
            reject(err);
        }
    });
}

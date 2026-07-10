/**
 * ============================================================
 * GUNTER BOT - Main Entry Point
 * ============================================================
 * Loads environment variables, initializes Firebase,
 * registers all event handlers, and logs the bot in.
 * ============================================================
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startServer } = require('./server');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

// --- Validate required environment variables on startup ---
const REQUIRED_ENV = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`[FATAL] Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.error(`[FATAL] Missing required environment variable: FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON`);
    process.exit(1);
}

// --- Initialize Firebase Admin SDK ---
require('./utils/firebase'); // Triggers the singleton init

// --- Create Discord Client ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- Initialize Music Player ---
const player = new Player(client);
player.extractors.loadMulti(DefaultExtractors).then(() => {
    console.log('[MUSIC] Các công cụ giải mã âm thanh đã được tải thành công!');
});

// Bắt lỗi âm thanh để bot không bị sập
player.events.on('error', (queue, error) => {
    console.error(`[MUSIC ERROR] Lỗi trong hàng đợi: ${error.message}`);
});
player.events.on('playerError', (queue, error) => {
    console.error(`[MUSIC ERROR] Lỗi hệ thống phát: ${error.message}`);
});

// --- Attach a commands Collection to the client ---
client.commands = new Collection();
client.snipes = new Collection(); // Khởi tạo bộ nhớ tạm để lưu tin nhắn bị xóa cho lệnh /snipe 

// --- Load Commands ---
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`[CMD] Loaded: /${command.data.name}`);
        } else {
            console.warn(`[WARN] Command at ${file} is missing "data" or "execute".`);
        }
    }
}

// --- Load Events ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[EVT] Loaded: ${event.name}`);
}

// --- Anti-Crash System ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('[ANTI-CRASH] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error('[ANTI-CRASH] Uncaught Exception:', err, 'origin:', origin);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.error('[ANTI-CRASH] Uncaught Exception Monitor:', err, 'origin:', origin);
});

// --- Login ---
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('[BOT] Login successful!');
        // Bật Web API để Render.com có thể nhận diện cổng (Port) và không bị báo lỗi.
        // Đây cũng là cổng để UptimeRobot ping giữ bot thức 24/7.
        startServer(client);
    })
    .catch(err => {
        console.error('[FATAL] Failed to login:', err.message);
        process.exit(1);
    });

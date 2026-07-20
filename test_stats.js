const { Client, GatewayIntentBits } = require('discord.js');
const { db } = require('./src/utils/firebase');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.login(process.env.DISCORD_TOKEN);
client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch('1494709249954156564');
        const channels = await guild.channels.fetch();
        channels.forEach(c => {
            if (c.name.includes('members') || c.name.includes('Members')) {
                console.log("Found stat channel:", c.name, c.id);
            }
        });
    } catch(e) {
        console.log("Fatal:", e);
    }
    process.exit(0);
});

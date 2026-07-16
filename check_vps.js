const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to VPS!');
    
    // We can inject a console.log into geminiChat.js to see exactly what payload AI returned
    const cmds = `
        sed -i 's/const matches = parsedActions.filter(p => {/console.log("[DEBUG GEMINI PAYLOAD]", payload, "\\n[DEBUG PARSED ACTIONS]", parsedActions);\\n        const matches = parsedActions.filter(p => {/g' /root/gunter-bot/src/utils/geminiChat.js
        pm2 restart gunter-bot
    `;
    
    conn.exec(cmds, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
        }).on('data', (d) => process.stdout.write(d))
          .stderr.on('data', (d) => process.stderr.write(d));
    });
}).connect({
    host: '103.179.188.63',
    port: 22,
    username: 'root',
    password: '4OEHxDCt2zk32q0x'
});

const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to VPS! Executing deployment...');
    const cmds = `
        cd /root/gunter-bot
        git fetch --all
        git reset --hard origin/main
        npm install
        pm2 restart gunter-bot || pm2 start src/index.js --name gunter-bot --time
        echo "DEPLOYMENT FINISHED"
    `;
    conn.exec(cmds, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('[SSH] Done. Code:', code);
            conn.end();
            process.exit(code);
        }).on('data', (d) => process.stdout.write(d))
          .stderr.on('data', (d) => process.stderr.write(d));
    });
}).connect({
    host: '103.179.188.63',
    port: 22,
    username: 'root',
    password: '4OEHxDCt2zk32q0x'
});

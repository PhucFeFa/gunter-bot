const fs = require('fs');
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to VPS!');
    
    let envB64 = '';
    let svcB64 = '';
    try {
        const env = fs.readFileSync('.env');
        envB64 = env.toString('base64');
    } catch(e) {}
    try {
        const svc = fs.readFileSync('serviceAccountKey.json');
        svcB64 = svc.toString('base64');
    } catch(e) {}

    let cmds = `
        mkdir -p /root/gunter-bot
        cd /root/gunter-bot
        if [ ! -d ".git" ]; then
            git init
            git remote add origin https://github.com/PhucFeFa/gunter-bot.git
        fi
        git fetch --all
        git reset --hard origin/main
        
        echo "${envB64}" | base64 -d > .env
    `;
    
    if (svcB64) {
        cmds += `echo "${svcB64}" | base64 -d > serviceAccountKey.json\n`;
    }
    
    cmds += `
        npm install
        pm2 delete gunter-bot || true
        pm2 start src/index.js --name gunter-bot --time
        pm2 save
        pm2 startup
    `;
    
    console.log('[SSH] Executing commands...');
    conn.exec(cmds, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('[SSH] Done. Code:', code);
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

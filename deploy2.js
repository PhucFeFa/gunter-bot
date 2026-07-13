const fs = require('fs');
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to VPS!');
    
    // Read local files
    let envContent = '';
    let svcContent = '';
    try {
        envContent = fs.readFileSync('.env', 'utf8');
    } catch(e) {}
    try {
        svcContent = fs.readFileSync('serviceAccountKey.json', 'utf8');
    } catch(e) {}

    // We will use SFTP to upload safely rather than echo interpolation which can break
    conn.sftp((err, sftp) => {
        if (err) throw err;
        
        conn.exec('mkdir -p /root/gunter-bot', (err, stream) => {
            if (err) throw err;
            stream.on('close', () => {
                let uploaded = 0;
                let toUpload = 0;
                
                function checkDone() {
                    if (uploaded === toUpload) {
                        runCommands();
                    }
                }

                if (envContent) {
                    toUpload++;
                    const writeStream = sftp.createWriteStream('/root/gunter-bot/.env');
                    writeStream.on('close', () => { uploaded++; checkDone(); });
                    writeStream.end(envContent);
                }
                
                if (svcContent) {
                    toUpload++;
                    const writeStream2 = sftp.createWriteStream('/root/gunter-bot/serviceAccountKey.json');
                    writeStream2.on('close', () => { uploaded++; checkDone(); });
                    writeStream2.end(svcContent);
                }
                
                if (toUpload === 0) runCommands();
            });
        });
    });
}).connect({
    host: '103.179.188.63',
    port: 22,
    username: 'root',
    password: '4OEHxDCt2zk32q0x'
});

function runCommands() {
    console.log('[SSH] Uploaded files. Executing commands...');
    const cmds = `
        cd /root/gunter-bot
        git config --global core.autocrlf false
        git init
        git remote add origin https://github.com/PhucFeFa/gunter-bot.git || true
        git fetch --all
        git reset --hard origin/main
        npm install
        pm2 delete gunter-bot || true
        pm2 start src/index.js --name gunter-bot --time
        pm2 save
        pm2 startup
    `;
    conn.exec(cmds, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('[SSH] Done. Code:', code);
            conn.end();
        }).on('data', (d) => process.stdout.write(d))
          .stderr.on('data', (d) => process.stderr.write(d));
    });
}

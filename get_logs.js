const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('pm2 logs gunter-bot --lines 50 --nostream', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => { conn.end(); process.exit(code); })
              .on('data', (d) => process.stdout.write(d))
              .stderr.on('data', (d) => process.stderr.write(d));
    });
}).connect({
    host: '103.179.188.63',
    port: 22,
    username: 'root',
    password: '4OEHxDCt2zk32q0x'
});

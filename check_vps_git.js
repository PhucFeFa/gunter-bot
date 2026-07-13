const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec(`
        cd /root/gunter-bot
        echo "Boc thep database..."
        cp data/database.sqlite data/database_backup_safe.sqlite || true
        echo "Cap nhat code..."
        git fetch --all
        git reset --hard origin/main
        echo "Tra lai database..."
        cp data/database_backup_safe.sqlite data/database.sqlite || true
        echo "Khoi dong lai..."
        pm2 restart gunter-bot
    `, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).connect({
    host: '103.179.188.63',
    port: 22,
    username: 'root',
    password: '4OEHxDCt2zk32q0x'
});

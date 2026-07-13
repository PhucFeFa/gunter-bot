const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('sync; echo 3 > /proc/sys/vm/drop_caches', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('Cache dropped successfully!');
            conn.end();
        }).on('data', (d) => process.stdout.write(d));
    });
}).connect({
    host: '103.179.188.63',
    port: 22,
    username: 'root',
    password: '4OEHxDCt2zk32q0x'
});

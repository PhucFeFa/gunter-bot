const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    try {
        await ssh.connect({ host: '103.179.188.63', username: 'root', password: '4OEHxDCt2zk32q0x' });
        console.log('Connected');
        await ssh.execCommand('pm2 delete gunter-bot || true', { cwd: '/root/gunter-bot' });
        const startCmd = 'pm2 start src/index.js --name "gunter-bot" --node-args="--max-old-space-size=1536"';
        const res = await ssh.execCommand(startCmd, { cwd: '/root/gunter-bot' });
        console.log(res.stdout);
        await ssh.execCommand('pm2 save', { cwd: '/root/gunter-bot' });
        console.log('Saved');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();

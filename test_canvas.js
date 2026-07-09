const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

async function test() {
    try {
        const canvas = createCanvas(700, 300);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#2F3136'; // Discord dark mode
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Load avatars
        const avatar1 = await loadImage('https://i.imgur.com/K3C23D8.png');
        const avatar2 = await loadImage('https://i.imgur.com/K3C23D8.png');
        
        // Draw avatars
        ctx.drawImage(avatar1, 50, 25, 250, 250);
        ctx.drawImage(avatar2, 400, 25, 250, 250);
        
        // Draw heart text instead of image (simpler)
        ctx.font = '100px Arial';
        ctx.fillStyle = '#E60023';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', 350, 150);

        const buffer = await canvas.encode('png');
        fs.writeFileSync('test.png', buffer);
        console.log('Saved test.png');
    } catch(e) {
        console.error(e.message);
    }
}
test();

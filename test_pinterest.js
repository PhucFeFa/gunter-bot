const google = require('googlethis');

async function test() {
    try {
        const images = await google.image('anime girl site:pinterest.com', { safe: false });
        console.log('Images found:', images.length);
        if (images.length > 0) {
            console.log(images.slice(0, 3).map(i => i.url));
        }
    } catch(e) {
        console.error(e.message);
    }
}
test();

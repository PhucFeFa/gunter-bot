const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGeminiResponse } = require('../../utils/geminiChat');
const { recordTarotPlay } = require('../../utils/economyDB');

const TAROT_CARDS = [
    { name: 'The Fool (Kẻ Khờ)', img: 'https://upload.wikimedia.org/wikipedia/en/9/90/RWS_Tarot_00_Fool.jpg' },
    { name: 'The Magician (Ảo Thuật Gia)', img: 'https://upload.wikimedia.org/wikipedia/en/d/de/RWS_Tarot_01_Magician.jpg' },
    { name: 'The High Priestess (Nữ Tư Tế)', img: 'https://upload.wikimedia.org/wikipedia/en/8/88/RWS_Tarot_02_High_Priestess.jpg' },
    { name: 'The Empress (Hoàng Hậu)', img: 'https://upload.wikimedia.org/wikipedia/en/d/d2/RWS_Tarot_03_Empress.jpg' },
    { name: 'The Emperor (Hoàng Đế)', img: 'https://upload.wikimedia.org/wikipedia/en/c/c3/RWS_Tarot_04_Emperor.jpg' },
    { name: 'The Hierophant (Giáo Hoàng)', img: 'https://upload.wikimedia.org/wikipedia/en/8/8d/RWS_Tarot_05_Hierophant.jpg' },
    { name: 'The Lovers (Tình Nhân)', img: 'https://upload.wikimedia.org/wikipedia/en/d/db/RWS_Tarot_06_Lovers.jpg' },
    { name: 'The Chariot (Cỗ Xe)', img: 'https://upload.wikimedia.org/wikipedia/en/9/9b/RWS_Tarot_07_Chariot.jpg' },
    { name: 'Strength (Sức Mạnh)', img: 'https://upload.wikimedia.org/wikipedia/en/f/f5/RWS_Tarot_08_Strength.jpg' },
    { name: 'The Hermit (Ẩn Sĩ)', img: 'https://upload.wikimedia.org/wikipedia/en/4/4d/RWS_Tarot_09_Hermit.jpg' },
    { name: 'Wheel of Fortune (Bánh Xe Số Phận)', img: 'https://upload.wikimedia.org/wikipedia/en/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg' },
    { name: 'Justice (Công Lý)', img: 'https://upload.wikimedia.org/wikipedia/en/e/e0/RWS_Tarot_11_Justice.jpg' },
    { name: 'The Hanged Man (Người Treo Ngược)', img: 'https://upload.wikimedia.org/wikipedia/en/2/2b/RWS_Tarot_12_Hanged_Man.jpg' },
    { name: 'Death (Tử Thần)', img: 'https://upload.wikimedia.org/wikipedia/en/d/d7/RWS_Tarot_13_Death.jpg' },
    { name: 'Temperance (Tiết Độ)', img: 'https://upload.wikimedia.org/wikipedia/en/f/f8/RWS_Tarot_14_Temperance.jpg' },
    { name: 'The Devil (Ác Quỷ)', img: 'https://upload.wikimedia.org/wikipedia/en/5/55/RWS_Tarot_15_Devil.jpg' },
    { name: 'The Tower (Tòa Tháp)', img: 'https://upload.wikimedia.org/wikipedia/en/5/53/RWS_Tarot_16_Tower.jpg' },
    { name: 'The Star (Ngôi Sao)', img: 'https://upload.wikimedia.org/wikipedia/en/d/db/RWS_Tarot_17_Star.jpg' },
    { name: 'The Moon (Mặt Trăng)', img: 'https://upload.wikimedia.org/wikipedia/en/7/7f/RWS_Tarot_18_Moon.jpg' },
    { name: 'The Sun (Mặt Trời)', img: 'https://upload.wikimedia.org/wikipedia/en/1/17/RWS_Tarot_19_Sun.jpg' },
    { name: 'Judgement (Phán Xét)', img: 'https://upload.wikimedia.org/wikipedia/en/d/dd/RWS_Tarot_20_Judgement.jpg' },
    { name: 'The World (Thế Giới)', img: 'https://upload.wikimedia.org/wikipedia/en/f/ff/RWS_Tarot_21_World.jpg' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tarot')
        .setDescription('🔮 Bốc một lá bài Tarot để xem nhân phẩm hôm nay của bạn!'),
        
    async execute(interaction) {
        await interaction.deferReply();
        await this.handleTarot(interaction, interaction.user);
    },
    
    async executePrefix(message) {
        const fakeInteraction = {
            user: message.author,
            deferReply: async () => await message.channel.sendTyping(),
            editReply: async (options) => await message.reply(options)
        };
        await this.handleTarot(fakeInteraction, message.author);
    },

    async handleTarot(interaction, user) {
        // Kiểm tra giới hạn 5 lần/ngày
        const tarotCheck = await recordTarotPlay(user.id);
        if (!tarotCheck.success) {
            return interaction.editReply('❌ Hôm nay mày bốc bài 5 lần rồi, vũ trụ cũng phải nghỉ ngơi chứ! Mai quay lại nhé.');
        }

        // Random 1 lá bài
        const card = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
        const isReversed = Math.random() > 0.5;
        const position = isReversed ? 'Ngược (Reversed)' : 'Xuôi (Upright)';

        // Dùng Gemini để tạo lời giải thích tấu hài
        const prompt = `Mày là Gunter, đóng vai một bà đồng bói bài Tarot siêu mất dạy, lấc cấc, hay chửi rủa và trù ẻo. KHÔNG CẦN DỄ THƯƠNG, chửi thẳng mặt nó.
Khách hàng tên là "${user.username}" vừa bốc được lá bài "${card.name}" ở vị trí "${position}".
Hãy phán 1 đoạn ngắn (khoảng 3-4 câu) về tình duyên, tiền bạc hoặc công việc của nó trong hôm nay. 
Chỉ trả về câu phán, không cần giải thích thêm. Càng phũ phàng càng tốt!`;

        let reading = "Vũ trụ đang bận chạy KPI, không có tín hiệu trả về. Hãy thử lại sau nhé!";
        try {
            reading = await getGeminiResponse(prompt);
        } catch (error) {
            console.error('[TAROT] Gemini error:', error);
        }

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6) // Tím ma thuật
            .setTitle(`🔮 Trải bài của ${user.username}`)
            .setDescription(`**Lá bài bốc được:** ${card.name}\n**Vị trí:** ${position}\n\n**Lời phán từ Vũ Trụ:**\n${reading}`)
            .setImage(card.img)
            .setFooter({ text: `Hôm nay bạn còn ${tarotCheck.remaining} lượt bốc bài. (Tối đa 5 lượt/ngày)` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

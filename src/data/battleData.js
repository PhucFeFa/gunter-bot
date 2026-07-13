const WEAPONS = [
    { id: 1, name: 'Nắm Đấm', emoji: '✊', price: 0, damage: [10, 20], critRate: 0.05, critMult: 1.5, desc: 'Vũ khí mặc định. Đấm chay.' },
    { id: 2, name: 'Kiếm Gỗ', emoji: '🗡️', price: 50000, damage: [20, 35], critRate: 0.1, critMult: 1.5, desc: 'Đồ chơi trẻ em.' },
    { id: 3, name: 'Đao Rỉ Sét', emoji: '🔪', price: 200000, damage: [40, 65], critRate: 0.15, critMult: 1.8, desc: 'Dễ gây uốn ván.' },
    { id: 4, name: 'Chùy Gai', emoji: '🏏', price: 800000, damage: [80, 120], critRate: 0.1, critMult: 2.0, desc: 'Chậm nhưng đau.' },
    { id: 5, name: 'Kiếm Katana', emoji: '🤺', price: 3000000, damage: [150, 220], critRate: 0.25, critMult: 2.0, desc: 'Bén như dao cạo.' },
    { id: 6, name: 'Rìu Chiến Thần', emoji: '🪓', price: 10000000, damage: [300, 450], critRate: 0.2, critMult: 2.5, desc: 'Chẻ đôi núi đá.' },
    { id: 7, name: 'Ma Pháp Trượng', emoji: '🪄', price: 35000000, damage: [500, 800], critRate: 0.3, critMult: 2.2, desc: 'Sức mạnh phép thuật.' },
    { id: 8, name: 'Thánh Kiếm Excalibur', emoji: '⚔️', price: 100000000, damage: [1200, 1800], critRate: 0.35, critMult: 2.5, desc: 'Kiếm của các vị vua.' },
    { id: 9, name: 'Hắc Long Đao', emoji: '🐉', price: 300000000, damage: [2500, 3800], critRate: 0.4, critMult: 3.0, desc: 'Lưỡi đao ngâm máu rồng.' },
    { id: 10, name: 'Găng Tay Vô Cực', emoji: '🧤', price: 1000000000, damage: [5000, 8000], critRate: 0.5, critMult: 4.0, desc: 'Búng tay là bay màu.' },
    { id: 11, name: 'Trượng Ma Thần', emoji: '🔮', price: 3000000000, damage: [10000, 15000], critRate: 0.55, critMult: 4.5, desc: 'Gọi hồn kẻ chết, nuốt chửng linh hồn.' },
    { id: 12, name: 'Song Kiếm Phá Trần', emoji: '⚔️', price: 10000000000, damage: [25000, 35000], critRate: 0.6, critMult: 5.0, desc: 'Chém đứt vạn vật, phá vỡ hư không.' },
    { id: 13, name: 'Rìu Khổng Lồ Ymir', emoji: '🪓', price: 30000000000, damage: [60000, 85000], critRate: 0.65, critMult: 5.5, desc: 'Sức mạnh của người khổng lồ băng.' },
    { id: 14, name: 'Cung Mặt Trời', emoji: '🏹', price: 100000000000, damage: [150000, 200000], critRate: 0.75, critMult: 6.0, desc: 'Bắn rớt cả mặt trời.' },
    { id: 15, name: 'Thanh Gươm Vũ Trụ', emoji: '🌌', price: 500000000000, damage: [500000, 800000], critRate: 0.85, critMult: 8.0, desc: 'Cắt đôi vũ trụ, sáng tạo ngân hà.' }
];

const ARMORS = [
    { id: 1, name: 'Áo Vải', emoji: '👕', price: 0, defense: 0, hpBonus: 50, desc: 'Mặc cho có.' },
    { id: 2, name: 'Giáp Da', emoji: '🦺', price: 50000, defense: 5, hpBonus: 150, desc: 'Chống trầy xước.' },
    { id: 3, name: 'Giáp Sắt', emoji: '🛡️', price: 200000, defense: 10, hpBonus: 300, desc: 'Nặng nề nhưng an toàn.' },
    { id: 4, name: 'Giáp Bạc', emoji: '🥋', price: 800000, defense: 15, hpBonus: 600, desc: 'Sáng bóng, chống tà ma.' },
    { id: 5, name: 'Giáp Hiệp Sĩ', emoji: '🪖', price: 3000000, defense: 20, hpBonus: 1200, desc: 'Trang bị hoàng gia.' },
    { id: 6, name: 'Giáp Titan', emoji: '🦾', price: 10000000, defense: 25, hpBonus: 2500, desc: 'Công nghệ tiên tiến.' },
    { id: 7, name: 'Áo Choàng Bóng Tối', emoji: '🥷', price: 35000000, defense: 30, hpBonus: 4500, desc: 'Khó bị đòn trúng.' },
    { id: 8, name: 'Giáp Thiên Thần', emoji: '👼', price: 100000000, defense: 35, hpBonus: 9000, desc: 'Ánh sáng bảo hộ.' },
    { id: 9, name: 'Giáp Vảy Rồng', emoji: '🐉', price: 300000000, defense: 40, hpBonus: 18000, desc: 'Không thể xuyên thủng.' },
    { id: 10, name: 'Hào Quang Đấng', emoji: '✨', price: 1000000000, defense: 45, hpBonus: 35000, desc: 'Bảo hộ thần thánh.' },
    { id: 11, name: 'Giáp Ác Quỷ', emoji: '👿', price: 3000000000, defense: 50, hpBonus: 70000, desc: 'Lấy sức mạnh từ địa ngục.' },
    { id: 12, name: 'Chiến Bào Tiên Nhân', emoji: '🥻', price: 10000000000, defense: 55, hpBonus: 150000, desc: 'Bay lượn như tiên, khó trúng đòn.' },
    { id: 13, name: 'Giáp Hư Không', emoji: '🕳️', price: 30000000000, defense: 60, hpBonus: 300000, desc: 'Hút mọi đòn đánh vào lỗ đen.' },
    { id: 14, name: 'Vòng Sáng Thiên Hà', emoji: '💫', price: 100000000000, defense: 65, hpBonus: 700000, desc: 'Phản chiếu sát thương.' },
    { id: 15, name: 'Áo Choàng Đấng Tối Cao', emoji: '👑', price: 500000000000, defense: 70, hpBonus: 1500000, desc: 'Phòng ngự tuyệt đối.' }
];

module.exports = { WEAPONS, ARMORS };

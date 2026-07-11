/**
 * fishData.js – Dữ liệu cá (90 loại) và cần câu (15 loại)
 * Zones: 1=Vịnh Làng Chài, 2=Đại Dương Sâu Thẳm, 3=Vùng Biển Tử Thần
 * Tier 1-8 (1=nhỏ/rẻ, 8=lớn/đắt)
 * basePrice (VNĐ xu): tier1=1k-5k, tier8=3M-15M
 * size: cm, price = basePrice * (size/minSize)
 */

const ZONES = [
    { id: 1, name: 'Vịnh Làng Chài', emoji: '🏖️', roleColor: 0x00BFFF },
    { id: 2, name: 'Đại Dương Sâu Thẳm', emoji: '🌊', roleColor: 0x0000CD },
    { id: 3, name: 'Vùng Biển Tử Thần', emoji: '💀', roleColor: 0x8B0000 },
];

// { id, name, emoji, zone, tier, basePrice, minSize, maxSize }
const FISH_LIST = [
    // ── ZONE 1 – Vịnh Làng Chài (tier 1-5) ─────────────────────
    { id: 1,  name:'Cá Bống',        emoji:'🐟', zone:1, tier:1, basePrice:1000,   minSize:5,   maxSize:20  },
    { id: 2,  name:'Cá Rô',          emoji:'🐟', zone:1, tier:1, basePrice:1500,   minSize:8,   maxSize:25  },
    { id: 3,  name:'Cá Diếc',        emoji:'🐟', zone:1, tier:1, basePrice:2000,   minSize:10,  maxSize:30  },
    { id: 4,  name:'Cá Linh',        emoji:'🐟', zone:1, tier:1, basePrice:1200,   minSize:6,   maxSize:18  },
    { id: 5,  name:'Cá Cơm',         emoji:'🐟', zone:1, tier:1, basePrice:1000,   minSize:5,   maxSize:15  },
    { id: 6,  name:'Cá Chạch',       emoji:'🐟', zone:1, tier:1, basePrice:2500,   minSize:15,  maxSize:40  },
    { id: 7,  name:'Cá Thia',        emoji:'🐠', zone:1, tier:1, basePrice:1800,   minSize:5,   maxSize:12  },
    { id: 8,  name:'Cá Sơn',         emoji:'🐠', zone:1, tier:1, basePrice:2200,   minSize:8,   maxSize:22  },
    { id: 9,  name:'Cá Lòng Tong',   emoji:'🐟', zone:1, tier:1, basePrice:1000,   minSize:4,   maxSize:12  },
    { id: 10, name:'Cá Giò Nhỏ',     emoji:'🐟', zone:1, tier:1, basePrice:3000,   minSize:20,  maxSize:45  },
    { id: 11, name:'Cá Trê',         emoji:'🐟', zone:1, tier:2, basePrice:5000,   minSize:20,  maxSize:60  },
    { id: 12, name:'Cá Lóc',         emoji:'🐟', zone:1, tier:2, basePrice:6000,   minSize:25,  maxSize:70  },
    { id: 13, name:'Cá Chép',        emoji:'🐟', zone:1, tier:2, basePrice:7000,   minSize:30,  maxSize:80  },
    { id: 14, name:'Cá Trắm',        emoji:'🐟', zone:1, tier:2, basePrice:8000,   minSize:35,  maxSize:100 },
    { id: 15, name:'Cá Mè',          emoji:'🐟', zone:1, tier:2, basePrice:5500,   minSize:25,  maxSize:75  },
    { id: 16, name:'Cá Phi',         emoji:'🐟', zone:1, tier:2, basePrice:4500,   minSize:18,  maxSize:55  },
    { id: 17, name:'Cá Rô Phi Đen',  emoji:'🐟', zone:1, tier:2, basePrice:5000,   minSize:20,  maxSize:60  },
    { id: 18, name:'Cá Tai Tượng',   emoji:'🐟', zone:1, tier:2, basePrice:9000,   minSize:40,  maxSize:120 },
    { id: 19, name:'Cá Sặc',         emoji:'🐠', zone:1, tier:2, basePrice:4000,   minSize:12,  maxSize:35  },
    { id: 20, name:'Cá Cờ',          emoji:'🐠', zone:1, tier:2, basePrice:4500,   minSize:15,  maxSize:40  },
    { id: 21, name:'Cá Vược Sông',   emoji:'🐟', zone:1, tier:3, basePrice:15000,  minSize:40,  maxSize:100 },
    { id: 22, name:'Cá Đù',          emoji:'🐟', zone:1, tier:3, basePrice:18000,  minSize:45,  maxSize:120 },
    { id: 23, name:'Cá Úc',          emoji:'🐟', zone:1, tier:3, basePrice:20000,  minSize:50,  maxSize:130 },
    { id: 24, name:'Cá Hố',          emoji:'🐟', zone:1, tier:3, basePrice:25000,  minSize:60,  maxSize:150 },
    { id: 25, name:'Cá Giò',         emoji:'🐟', zone:1, tier:3, basePrice:22000,  minSize:55,  maxSize:140 },
    { id: 26, name:'Cá Dứa',         emoji:'🐟', zone:1, tier:3, basePrice:30000,  minSize:70,  maxSize:180 },
    { id: 27, name:'Cá Mú Nhỏ',      emoji:'🐡', zone:1, tier:3, basePrice:35000,  minSize:80,  maxSize:200 },
    { id: 28, name:'Cá Trích',       emoji:'🐟', zone:1, tier:3, basePrice:12000,  minSize:30,  maxSize:80  },
    { id: 29, name:'Cá Bướm Đốm',    emoji:'🐠', zone:1, tier:3, basePrice:20000,  minSize:20,  maxSize:50  },
    { id: 30, name:'Cá Nóc Nhỏ',     emoji:'🐡', zone:1, tier:3, basePrice:18000,  minSize:15,  maxSize:40  },
    { id: 31, name:'Cá Thu Nhỏ',     emoji:'🐟', zone:1, tier:4, basePrice:60000,  minSize:80,  maxSize:180 },
    { id: 32, name:'Cá Ngừ Nhỏ',     emoji:'🐟', zone:1, tier:4, basePrice:80000,  minSize:100, maxSize:250 },
    { id: 33, name:'Cá Hồng Nhỏ',    emoji:'🐠', zone:1, tier:4, basePrice:70000,  minSize:90,  maxSize:220 },
    { id: 34, name:'Cá Cam Nhỏ',     emoji:'🐠', zone:1, tier:4, basePrice:65000,  minSize:85,  maxSize:210 },
    { id: 35, name:'Cá Kiếm Nhỏ',    emoji:'🐟', zone:1, tier:4, basePrice:90000,  minSize:120, maxSize:280 },
    { id: 36, name:'Cá Đuối Vàng',   emoji:'🦈', zone:1, tier:5, basePrice:150000, minSize:80,  maxSize:200 },
    { id: 37, name:'Cá Mú Vàng',     emoji:'🐡', zone:1, tier:5, basePrice:180000, minSize:100, maxSize:280 },
    { id: 38, name:'Cá Sư Tử',       emoji:'🐠', zone:1, tier:5, basePrice:200000, minSize:30,  maxSize:60  },
    { id: 39, name:'Cá Thiên Thần',   emoji:'🐠', zone:1, tier:5, basePrice:220000, minSize:15,  maxSize:40  },
    { id: 40, name:'Cá Koi Đặc Biệt', emoji:'🐠', zone:1, tier:5, basePrice:250000, minSize:40,  maxSize:90  },

    // ── ZONE 2 – Đại Dương Sâu Thẳm (tier 2-7) ─────────────────
    { id: 41, name:'Cá Ngừ Vây Xanh', emoji:'🐟', zone:2, tier:2, basePrice:5000,   minSize:80,  maxSize:200 },
    { id: 42, name:'Cá Thu Đại Dương', emoji:'🐟', zone:2, tier:2, basePrice:6000,   minSize:70,  maxSize:180 },
    { id: 43, name:'Cá Đuối Sọc',     emoji:'🦈', zone:2, tier:2, basePrice:5500,   minSize:60,  maxSize:160 },
    { id: 44, name:'Cá Bơn',          emoji:'🐟', zone:2, tier:3, basePrice:15000,  minSize:40,  maxSize:110 },
    { id: 45, name:'Cá Bộ Đầu',       emoji:'🐟', zone:2, tier:3, basePrice:18000,  minSize:50,  maxSize:130 },
    { id: 46, name:'Cá Đen Biển',     emoji:'🐟', zone:2, tier:3, basePrice:20000,  minSize:55,  maxSize:140 },
    { id: 47, name:'Cá Tầm',          emoji:'🐟', zone:2, tier:3, basePrice:25000,  minSize:100, maxSize:300 },
    { id: 48, name:'Cá Vược Biển',    emoji:'🐟', zone:2, tier:3, basePrice:22000,  minSize:60,  maxSize:150 },
    { id: 49, name:'Cá Hồng Biển',    emoji:'🐠', zone:2, tier:3, basePrice:20000,  minSize:50,  maxSize:130 },
    { id: 50, name:'Cá Mú Đỏ',        emoji:'🐡', zone:2, tier:4, basePrice:60000,  minSize:80,  maxSize:200 },
    { id: 51, name:'Cá Mú Đen',       emoji:'🐡', zone:2, tier:4, basePrice:65000,  minSize:85,  maxSize:210 },
    { id: 52, name:'Cá Cam Lớn',      emoji:'🐠', zone:2, tier:4, basePrice:70000,  minSize:90,  maxSize:230 },
    { id: 53, name:'Cá Kiếm Xanh',    emoji:'🐟', zone:2, tier:4, basePrice:85000,  minSize:150, maxSize:350 },
    { id: 54, name:'Cá Búa',          emoji:'🦈', zone:2, tier:4, basePrice:90000,  minSize:200, maxSize:450 },
    { id: 55, name:'Cá Mặt Quỷ',      emoji:'🐡', zone:2, tier:4, basePrice:80000,  minSize:40,  maxSize:100 },
    { id: 56, name:'Cá Ngừ Mắt To',   emoji:'🐟', zone:2, tier:5, basePrice:150000, minSize:120, maxSize:280 },
    { id: 57, name:'Cá Cờ Xanh',      emoji:'🐟', zone:2, tier:5, basePrice:180000, minSize:150, maxSize:350 },
    { id: 58, name:'Cá Hồng Vua',     emoji:'🐠', zone:2, tier:5, basePrice:200000, minSize:100, maxSize:250 },
    { id: 59, name:'Cá Đuối Khổng Lồ',emoji:'🦈', zone:2, tier:5, basePrice:250000, minSize:300, maxSize:700 },
    { id: 60, name:'Cá Voi Nhỏ',      emoji:'🐋', zone:2, tier:5, basePrice:300000, minSize:400, maxSize:800 },
    { id: 61, name:'Cá Mập Vây Trắng',emoji:'🦈', zone:2, tier:6, basePrice:500000, minSize:200, maxSize:500 },
    { id: 62, name:'Cá Ngừ Vua',      emoji:'🐟', zone:2, tier:6, basePrice:600000, minSize:180, maxSize:450 },
    { id: 63, name:'Cá Lưỡi Kiếm',    emoji:'🐟', zone:2, tier:6, basePrice:700000, minSize:200, maxSize:500 },
    { id: 64, name:'Cá Mú Khổng Lồ',  emoji:'🐡', zone:2, tier:6, basePrice:800000, minSize:150, maxSize:400 },
    { id: 65, name:'Cá Đuối Ma',      emoji:'🦈', zone:2, tier:7, basePrice:2000000,minSize:400, maxSize:900 },
    { id: 66, name:'Cá Mập Trắng Nhỏ',emoji:'🦈', zone:2, tier:7, basePrice:2500000,minSize:300, maxSize:700 },
    { id: 67, name:'Cá Voi Lưng Gù',  emoji:'🐋', zone:2, tier:7, basePrice:3000000,minSize:800, maxSize:1500},
    { id: 68, name:'Cá Mập Búa Lớn',  emoji:'🦈', zone:2, tier:7, basePrice:2200000,minSize:350, maxSize:800 },

    // ── ZONE 3 – Vùng Biển Tử Thần (tier 4-8) ──────────────────
    { id: 69, name:'Cá Mực Khổng Lồ', emoji:'🦑', zone:3, tier:4, basePrice:80000,  minSize:100, maxSize:250 },
    { id: 70, name:'Cá Bạch Tuộc',    emoji:'🐙', zone:3, tier:4, basePrice:90000,  minSize:80,  maxSize:200 },
    { id: 71, name:'Cá Rồng Biển',    emoji:'🐉', zone:3, tier:5, basePrice:200000, minSize:50,  maxSize:120 },
    { id: 72, name:'Cá Sứa Độc',      emoji:'🪼', zone:3, tier:5, basePrice:180000, minSize:30,  maxSize:80  },
    { id: 73, name:'Cá Mập Hổ',       emoji:'🦈', zone:3, tier:5, basePrice:250000, minSize:300, maxSize:700 },
    { id: 74, name:'Cá Mực Bạch',     emoji:'🦑', zone:3, tier:5, basePrice:220000, minSize:60,  maxSize:150 },
    { id: 75, name:'Cá Bọ Biển',      emoji:'🦞', zone:3, tier:5, basePrice:160000, minSize:40,  maxSize:100 },
    { id: 76, name:'Cá Đèn Biển Sâu', emoji:'🐠', zone:3, tier:6, basePrice:500000, minSize:20,  maxSize:60  },
    { id: 77, name:'Cá Răng Cưa',     emoji:'🦈', zone:3, tier:6, basePrice:600000, minSize:200, maxSize:500 },
    { id: 78, name:'Cá Mập Mako',     emoji:'🦈', zone:3, tier:6, basePrice:700000, minSize:250, maxSize:600 },
    { id: 79, name:'Cá Kình Biển',    emoji:'🐋', zone:3, tier:6, basePrice:800000, minSize:500, maxSize:1200},
    { id: 80, name:'Cá Mực Ma',       emoji:'🦑', zone:3, tier:6, basePrice:650000, minSize:100, maxSize:300 },
    { id: 81, name:'Cá Mập Đầu Bò',   emoji:'🦈', zone:3, tier:7, basePrice:2000000,minSize:300, maxSize:700 },
    { id: 82, name:'Cá Voi Sát Thủ',  emoji:'🐋', zone:3, tier:7, basePrice:3000000,minSize:600, maxSize:1400},
    { id: 83, name:'Cá Mập Ngủ',      emoji:'🦈', zone:3, tier:7, basePrice:2500000,minSize:400, maxSize:900 },
    { id: 84, name:'Cá Quái Thú Sâu', emoji:'🐉', zone:3, tier:7, basePrice:3500000,minSize:200, maxSize:600 },
    { id: 85, name:'Cá Mập Trắng Lớn',emoji:'🦈', zone:3, tier:8, basePrice:8000000,minSize:400, maxSize:1000},
    { id: 86, name:'Cá Voi Xanh',     emoji:'🐋', zone:3, tier:8, basePrice:10000000,minSize:2000,maxSize:3000},
    { id: 87, name:'Cá Mập Thần',     emoji:'🦈', zone:3, tier:8, basePrice:12000000,minSize:500, maxSize:1200},
    { id: 88, name:'Cá Rồng Biển Cổ Đại',emoji:'🐉',zone:3,tier:8,basePrice:15000000,minSize:300,maxSize:800 },
    { id: 89, name:'Quái Vật Biển Sâu',emoji:'👾', zone:3, tier:8, basePrice:9000000, minSize:400, maxSize:1000},
    { id: 90, name:'Leviathan',       emoji:'🌊', zone:3, tier:8, basePrice:15000000,minSize:1000,maxSize:3000},
];

// Weight per tier (higher tier = rarer)
const TIER_WEIGHT = { 1:35, 2:25, 3:18, 4:10, 5:6, 6:3, 7:2, 8:1 };

// Chest rewards (VNĐ xu)
const CHEST_REWARDS = [
    { label:'Rác cũ 🗑️',    coins:0,       weight:30 },
    { label:'Ít tiền 💵',    coins:5000,    weight:30 },
    { label:'Tiền kha khá 💵',coins:50000,  weight:20 },
    { label:'Tiền tốt 💰',   coins:200000,  weight:10 },
    { label:'Tiền lớn 💎',   coins:1000000, weight:7  },
    { label:'Jackpot 🎉',    coins:5000000, weight:3  },
];

// 15 fishing rods
const RODS = [
    // Normal shop (id 1-10)
    { id:1,  name:'Cần Tre',           emoji:'🎋', price:0,        limited:false, tier:1, bonusLuck:0,   bonusSize:0,    bonusTime:-0,   desc:'Cần mặc định miễn phí. Yếu nhất.' },
    { id:2,  name:'Cần Nhựa',          emoji:'🎣', price:50000,    limited:false, tier:1, bonusLuck:2,   bonusSize:0.05, bonusTime:1,    desc:'Nhẹ và bền hơn cần tre.' },
    { id:3,  name:'Cần Sợi Carbon',    emoji:'🎣', price:200000,   limited:false, tier:2, bonusLuck:5,   bonusSize:0.1,  bonusTime:2,    desc:'Sợi carbon nhẹ, cảm giác tốt hơn.' },
    { id:4,  name:'Cần Thép',          emoji:'🎣', price:500000,   limited:false, tier:2, bonusLuck:8,   bonusSize:0.15, bonusTime:2,    desc:'Bền, kéo được cá lớn hơn.' },
    { id:5,  name:'Cần Chuyên Nghiệp', emoji:'🎣', price:1000000,  limited:false, tier:3, bonusLuck:12,  bonusSize:0.2,  bonusTime:3,    desc:'Dành cho ngư dân có kinh nghiệm.' },
    { id:6,  name:'Cần Titan',         emoji:'🪝', price:3000000,  limited:false, tier:3, bonusLuck:16,  bonusSize:0.25, bonusTime:4,    desc:'Titan siêu bền, độ nhạy cao.' },
    { id:7,  name:'Cần Biển Xanh',     emoji:'🌊', price:8000000,  limited:false, tier:4, bonusLuck:22,  bonusSize:0.35, bonusTime:5,    desc:'Thiết kế cho câu biển khơi.' },
    { id:8,  name:'Cần Đại Dương',     emoji:'🌊', price:20000000, limited:false, tier:4, bonusLuck:28,  bonusSize:0.45, bonusTime:6,    desc:'Câu được các loài cá biển sâu.' },
    { id:9,  name:'Cần Thủy Thần',     emoji:'⚓', price:50000000, limited:false, tier:5, bonusLuck:36,  bonusSize:0.6,  bonusTime:8,    desc:'Truyền thuyết ngư dân. Hiếm thấy.' },
    { id:10, name:'Cần Huyền Thoại',   emoji:'✨', price:100000000,limited:false, tier:5, bonusLuck:45,  bonusSize:0.8,  bonusTime:10,   desc:'Đỉnh cao câu cá thông thường.' },
    // Limited shop (id 11-15)
    { id:11, name:'Cần Băng Giá',      emoji:'❄️', price:20000000, limited:true,  tier:3, bonusLuck:20,  bonusSize:0.3,  bonusTime:5,    desc:'[GIỚI HẠN] Tăng tỉ lệ rương báu.' },
    { id:12, name:'Cần Lửa Địa Ngục',  emoji:'🔥', price:50000000, limited:true,  tier:4, bonusLuck:30,  bonusSize:0.5,  bonusTime:7,    desc:'[GIỚI HẠN] Tăng tỉ lệ cá tier cao.' },
    { id:13, name:'Cần Sét',           emoji:'⚡', price:100000000,limited:true,  tier:4, bonusLuck:38,  bonusSize:0.65, bonusTime:9,    desc:'[GIỚI HẠN] Cá lên cực nhanh.' },
    { id:14, name:'Cần Bóng Tối',      emoji:'🌑', price:150000000,limited:true,  tier:5, bonusLuck:50,  bonusSize:0.9,  bonusTime:12,   desc:'[GIỚI HẠN] Tiếp cận vùng Tử Thần dễ hơn.' },
    { id:15, name:'Cần Thần Thánh',    emoji:'🌟', price:250000000,limited:true,  tier:5, bonusLuck:60,  bonusSize:1.0,  bonusTime:15,   desc:'[GIỚI HẠN] Cần tốt nhất mọi thời đại.' },
];

// Role names for 3 zones
const ZONE_ROLES = [
    { zone:1, name:'🏖️ Ngư Dân Vịnh',        color:0x00BFFF },
    { zone:2, name:'🌊 Thủy Thủ Đại Dương',   color:0x0000CD },
    { zone:3, name:'💀 Chiến Binh Tử Thần',   color:0x8B0000 },
];

function getFishForZone(zoneId) {
    return FISH_LIST.filter(f => f.zone === zoneId);
}

function getWeightedFish(zoneId) {
    const pool = FISH_LIST.filter(f => f.zone <= zoneId);
    const weights = pool.map(f => TIER_WEIGHT[f.tier]);
    const total = weights.reduce((a,b)=>a+b,0);
    let r = Math.random()*total;
    for(let i=0;i<pool.length;i++){
        r -= weights[i];
        if(r<=0) return pool[i];
    }
    return pool[pool.length-1];
}

function rollFishSize(fish) {
    return Math.floor(fish.minSize + Math.random()*(fish.maxSize-fish.minSize));
}

function calcFishPrice(fish, size) {
    return Math.floor(fish.basePrice * (size/fish.minSize));
}

function rollChest() {
    const total = CHEST_REWARDS.reduce((a,b)=>a+b.weight,0);
    let r = Math.random()*total;
    for(const c of CHEST_REWARDS){
        r-=c.weight;
        if(r<=0) return c;
    }
    return CHEST_REWARDS[0];
}

module.exports = { ZONES, FISH_LIST, RODS, ZONE_ROLES, TIER_WEIGHT, CHEST_REWARDS, getFishForZone, getWeightedFish, rollFishSize, calcFishPrice, rollChest };

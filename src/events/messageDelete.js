module.exports = {
    name: 'messageDelete',
    execute(message, client) {
        // Bỏ qua tin nhắn của bot hoặc tin nhắn không nằm trong guild (như DM)
        if (message.author?.bot || !message.guild) return;

        // Lấy danh sách snipes hiện tại của kênh này (nếu chưa có thì tạo mảng trống)
        const snipes = client.snipes.get(message.channel.id) || [];
        
        // Thêm tin nhắn mới xóa lên đầu mảng
        snipes.unshift({
            content: message.content,
            author: message.author,
            image: message.attachments.first()?.proxyURL || null,
            date: new Date().getTime()
        });

        // Giới hạn chỉ lưu tối đa 5 tin nhắn gần nhất
        if (snipes.length > 5) snipes.pop();
        
        // Lưu lại vào Collection
        client.snipes.set(message.channel.id, snipes);
    }
};

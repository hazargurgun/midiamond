const Message = require('../models/Message');

exports.getMessages = async (req, res) => {
    try {
        if (!req.session.user) return res.json({ success: false, messages: [] });
        
        const userId = req.session.user._id || req.session.user.id;
        const messages = await Message.find({
            $or: [
                { sender: userId },
                { receiver: userId }
            ]
        }).sort({ createdAt: 1 });
        
        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ success: false, message: 'Lütfen giriş yapın' });
        
        const { content } = req.body;
        const newMessage = new Message({
            sender: req.session.user._id || req.session.user.id,
            isAdminSender: false,
            content
        });
        
        await newMessage.save();

        // Otomatik Yanıt: Eğer bu kullanıcının son 1 saat içindeki ilk mesajıysa veya hiç mesajı yoksa
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentAutoReply = await Message.findOne({
            receiver: userId,
            isAdminSender: true,
            content: /en yakın zamanda müşteri temsilcimiz/i,
            createdAt: { $gte: oneHourAgo }
        });

        if (!recentAutoReply) {
            const autoReply = new Message({
                receiver: userId,
                isAdminSender: true,
                content: 'En yakın zamanda müşteri temsilcimiz sizinle irtibat kuracaktır.'
            });
            await autoReply.save();
        }

        res.json({ success: true, message: newMessage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join a train room to get live seat updates
        socket.on('join_train', (train_id) => {
            socket.join(`train_${train_id}`);
            console.log(`User joined train room: train_${train_id}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
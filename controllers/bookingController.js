const db = require('../config/db');

// BOOK A SEAT — atomic lock
exports.bookSeat = async(req, res) => {
    const { train_id } = req.body;
    const user_id = req.user.id;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Lock the row and check availability
        const [trains] = await connection.query(
            'SELECT * FROM trains WHERE id = ? AND available_seats > 0 FOR UPDATE', [train_id]
        );

        if (trains.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'No seats available' });
        }

        const train = trains[0];

        // Decrement seat count
        await connection.query(
            'UPDATE trains SET available_seats = available_seats - 1 WHERE id = ?', [train_id]
        );

        // Create booking
        const [result] = await connection.query(
            'INSERT INTO bookings (user_id, train_id, seat_number, status) VALUES (?, ?, ?, ?)', [user_id, train_id, train.total_seats - train.available_seats + 1, 'confirmed']
        );

        await connection.commit();

        res.status(201).json({
            message: 'Seat booked successfully!',
            booking_id: result.insertId,
            seat_number: train.total_seats - train.available_seats + 1,
            train: train.train_name
        });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

// GET USER BOOKINGS
exports.getMyBookings = async(req, res) => {
    try {
        const [bookings] = await db.query(
            `SELECT b.*, t.train_name, t.source, t.destination, t.journey_date, t.departure_time 
             FROM bookings b 
             JOIN trains t ON b.train_id = t.id 
             WHERE b.user_id = ?`, [req.user.id]
        );
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
const db = require('../config/db');

// SEARCH TRAINS
exports.searchTrains = async(req, res) => {
    const { source, destination, date } = req.query;
    try {
        const [trains] = await db.query(
            'SELECT * FROM trains WHERE source = ? AND destination = ? AND journey_date = ? AND available_seats > 0', [source, destination, date]
        );
        res.json(trains);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET TRAIN BY ID
exports.getTrainById = async(req, res) => {
    try {
        const [trains] = await db.query('SELECT * FROM trains WHERE id = ?', [req.params.id]);
        if (trains.length === 0) {
            return res.status(404).json({ error: 'Train not found' });
        }
        res.json(trains[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET ALL TRAINS
exports.getAllTrains = async(req, res) => {
    try {
        const [trains] = await db.query('SELECT * FROM trains');
        res.json(trains);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
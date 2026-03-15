const express = require('express');
const router = express.Router();
const { bookSeat, getMyBookings } = require('../controllers/bookingController');
const auth = require('../middleware/authMiddleware');

router.post('/book', auth, bookSeat);
router.get('/my', auth, getMyBookings);

module.exports = router;
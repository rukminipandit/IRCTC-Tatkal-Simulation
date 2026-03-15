const express = require('express');
const router = express.Router();
const { searchTrains, getTrainById, getAllTrains } = require('../controllers/trainController');
const auth = require('../middleware/authMiddleware');

router.get('/search', auth, searchTrains);
router.get('/all', auth, getAllTrains);
router.get('/:id', auth, getTrainById);

module.exports = router;
const express = require('express');
const { listEvents, getEventById } = require('../controllers/eventsController');
const { updatesLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(updatesLimiter);

router.get('/', (req, res, next) => listEvents(req, res, next));
router.get('/:id', (req, res, next) => getEventById(req, res, next));

module.exports = router;

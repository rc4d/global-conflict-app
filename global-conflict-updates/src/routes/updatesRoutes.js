const express = require('express');
const { listUpdates, routeUpdateByParam } = require('../controllers/updatesController');
const { triggerManualSync } = require('../controllers/syncController');
const { updatesLimiter } = require('../middleware/rateLimiter');
const { requireAdminSyncSecret } = require('../middleware/adminSyncAuth');

const router = express.Router();

router.use(updatesLimiter);

router.post('/sync', requireAdminSyncSecret, (req, res, next) =>
  triggerManualSync(req, res, next)
);

router.get('/', (req, res, next) => listUpdates(req, res, next));
router.get('/:param', (req, res, next) => routeUpdateByParam(req, res, next));

module.exports = router;

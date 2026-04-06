/**
 * Lightweight probe for uptime checks and load balancers.
 */
function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };

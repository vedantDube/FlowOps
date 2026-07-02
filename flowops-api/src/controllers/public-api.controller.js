/**
 * Public API (Feature #12 follow-through): the authenticateApiKey /
 * requireScope middleware already existed and worked correctly, but no
 * route was ever mounted behind them, so customer-generated API keys did
 * nothing. This controller is the thin adapter that lets /api/v1/* reuse
 * metrics.controller.js's existing query logic without duplicating it.
 */

// API-key-authed requests must never trust a client-supplied ?orgId= — a
// key minted for org A must not be able to read org B's data by passing
// a different orgId in the query string. Overwrite it with the org the
// key actually belongs to (set by authenticateApiKey) before the shared
// metrics handlers ever see the query.
exports.pinOrgToApiKey = (req, res, next) => {
  if (!req.isApiKeyAuth) {
    return res.status(401).json({ error: "API key required (X-API-Key header)" });
  }
  req.query.orgId = req.orgId;
  next();
};

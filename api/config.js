// GET /api/config — tells the app how to reach the login service.
// Only public values are sent (the anon/publishable key is meant to be public).

const { authConfigured, URL_, ANON } = require("./_auth");
const { isDemo } = require("./_shared");

module.exports = (req, res) => {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify({
    auth: authConfigured() ? { url: URL_, anonKey: ANON } : null,
    demo: isDemo(),
  }));
};

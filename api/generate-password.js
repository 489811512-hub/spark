const { generatePassword, jsonResponse, parseBody } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    const r = jsonResponse({}, 200);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
    return;
  }

  try {
    const data = await parseBody(req);
    const machineId = data.machine_id;

    if (!machineId) {
      const r = jsonResponse({ error: 'machine_id is required' }, 400);
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }

    const password = generatePassword(machineId);
    const r = jsonResponse({
      machine_id: machineId,
      password: password
    });
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  } catch (err) {
    console.error('Generate password error:', err);
    const r = jsonResponse({ error: err.message }, 500);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  }
};

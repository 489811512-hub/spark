const { getMachinesData, jsonResponse, isOnline } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    const r = jsonResponse({}, 200);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
    return;
  }

  try {
    const machinesData = await getMachinesData();
    const allMachines = machinesData.machines || [];
    const total = allMachines.length;
    const locked = allMachines.filter(m => m.locked).length;
    const online = allMachines.filter(m => isOnline(m)).length;

    const now = new Date();
    const todayNew = allMachines.filter(m => {
      const regDate = new Date(m.registered_at);
      return regDate.toDateString() === now.toDateString();
    }).length;

    const r = jsonResponse({
      total,
      online,
      locked,
      today_new: todayNew
    });
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  } catch (err) {
    console.error('Stats error:', err);
    const r = jsonResponse({ error: err.message }, 500);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  }
};

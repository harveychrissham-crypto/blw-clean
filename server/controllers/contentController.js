const items = [
  { id: 1, title: 'Campus Revival Week', type: 'Outreach', status: 'Live' },
  { id: 2, title: 'Monthly Prayer Gathering', type: 'Announcement', status: 'Draft' }
];

export const listContent = (req, res) => {
  res.json(items);
};

export const createContent = (req, res) => {
  const newItem = { id: Date.now(), ...req.body };
  items.push(newItem);
  res.status(201).json(newItem);
};

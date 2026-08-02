const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Project2_merged_data.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

const areas = new Set();
const blocks = new Set();
const restaurants = new Set();
const categories = new Set();

rows.forEach(r => {
  if (r.Area) areas.add(String(r.Area).trim());
  if (r.Block) blocks.add(String(r.Block).trim());
  if (r.Restaurant) restaurants.add(String(r.Restaurant).trim());
  if (r.Category) categories.add(String(r.Category).trim());
});

console.log('Unique Areas:', Array.from(areas));
console.log('Unique Blocks:', Array.from(blocks));
console.log('Unique Restaurants Count:', restaurants.size, Array.from(restaurants).slice(0, 10));
console.log('Unique Categories Count:', categories.size, Array.from(categories).slice(0, 10));
console.log('Total Menu Items:', rows.length);

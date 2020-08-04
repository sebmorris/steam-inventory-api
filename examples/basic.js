const InventoryApi = require('../dist/index.js');

const inventoryApi = Object.create(InventoryApi);
inventoryApi.init({
  id: 'Name of inventoryApi instance',
  // Array of proxy ips
  proxy: [

  ],
  // Repeats for each proxy (default 1)
  proxyRepeat: 1,
  // Max proxy requests per specified interval (default 25)
  maxUse: 25,
  // Interval for maxUse in ms (default 1 min)
  requestInterval: 60 * 1000,
  requestTimeout: 9000
  // (default 9000 ms)
  //SteamApisKey: "STEAM_APIS_KEY_IF_USING_STEAM_APIS"
  // If not using just don't include this
});

const contextid = 6;
const steamid = '76561198318520345';
const appid = 753;

inventoryApi.get({
  appid,
  contextid,
  steamid,
  tradable: true,
})
.then((res) => {
  console.log(`Retrieved inventory 1\n${res.total} total items`);
  // console.log(`Item market names:\n${JSON.stringify(res.items.map(item => item.market_hash_name), null, 4)}`);
  console.log(res);
  console.log(`${inventoryApi.recentRequests} recent requests have been made`);
})
.catch((err) => {
  console.log('Woah! Something went wrong', err);
});

/*inventoryApi.size({
  appid,
  contextid,
  steamid,
})
.then((res) => {
  console.log(`Inventory has size ${res}`);
  console.log(`${inventoryApi.recentRequests} recent requests have been made`);
})
.catch((err) => {
  console.log('Woah! Something went wrong', err);
});*/
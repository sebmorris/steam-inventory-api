# Steam inventory API

## This project is now deprecated. Please use node-steam-bot-manager-ng instead.
Please use my other repo and npm package: https://github.com/itsjfx/node-steam-inventory-api-ng  
npm: https://www.npmjs.com/package/steam-inventory-api-ng 

### Changes in this fork

1. Use of the "more_items" and "last_assetid" params from the inventory response from Steam. Some large inventories 50k+ items had issues loading without these parameters.

2. Count param added to makeRequest res block

3. If the first inventory request failed result will be undefined, which would crash the API inside the makeRequest res block. Now it checks if !result and will attempt to get again.

```
const InventoryApi = require('steam-inventory-api');
const inventoryApi = Object.create(InventoryApi);
inventoryApi.init({
  id: 'Name of inventoryApi instance',
  // Proxy ip array
  proxy: [

  ],  
  // Repeats for each proxy during rotation (default 1)
  proxyRepeat: 1,
  // Max proxy requests per specified interval (default 25)
  maxUse: 25,
  // Reset requests interval (default 1 min)
  requestInterval: 60 * 1000,
});
```
More examples can be found in `./examples`


### inventoryApi#get

```
inventoryApi.get({
  appid,
  contextid,
  steamid,
  start, // Assetid to start from (leave this blank for a normal request)
  count = 5000, // Items to retrieve per request (max 5000, not much reason to change this)
  language = 'english', // Defaults english
  tradable = true, // Defaults true
  retries = 1, // Number of retries
  retryDelay = 0, // Delay between successive retries
  retryFn = () => true, // Called with current res. Used to decide if more items should be requested between requests (inventories larger than 'count' only) 
})
```
Retrieves a user's inventory. Returns a promise, with res: `{ items: [/*array of CEconItems*/], total: [/*total items*/] }`.

### inventoryApi#size

```
inventoryApi.size({
  appid,
  contextid,
  steamid,
  retries,
})
```
Retrieves number of items for a specified context. Returns a promise, with int res: ${Number Of Items}. Shorthand `get`.

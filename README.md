# Steam inventory API

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
})
```
Retrieves a user's inventory. Returns a promise, with res: `{ items: [/*array of CEconItems*/], total: [/*total items*/] }`.

### inventoryApi#size

```
inventoryApi.size({
  appid,
  contextid,
  steamid,
})
```
Retrieves number of items for a specified context. Returns a promise, with int res: ${Number Of Items}. Shorthand `get`.

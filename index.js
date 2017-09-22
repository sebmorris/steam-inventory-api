'use strict';

const request = require('request-promise-native');
//CEconItem from 'McKay's steam packages
const CEconItem = require('./CEconItem.js');
const rotateArray = require('./rotate-array.js');

exports.getInventory = (steamid, appid, contextid, tradableOnly, proxy) => {
  let proxyChoice = () => proxy;
  if (typeof proxy === 'object') proxyChoice = rotateArray(proxy, 1);

  const makeRequest = (lastAssetId) => {
    return request({
      url: 'http://steamcommunity.com/inventory/'+steamid+'/'+appid+'/'+contextid+'?l=english&count=5000'+(lastAssetId ? '&start_assetid='+lastAssetId : ''),
      proxy: proxyChoice(),
      json: true
    });
  };

  const parseRes = (res) => {
    if (res.success && res.total_inventory_count === 0) return inventory;
    if (!res || !res.success || !res.assets || !res.descriptions) throw 'Malformed response';

    for (let item in res.assets) {
      if(!res.assets.hasOwnProperty(item)) continue;
      const generatedItem = new CEconItem(res.assets[item], res.descriptions, contextid);
      if (!tradableOnly || generatedItem.tradable) inventory.push(generatedItem);
    }
  };

  // Large inventory hotfix:
  // - Use proxy ips in chain
  // Long term
  // - Simultaneous requests (ie multiple proxy chains)

  let inventory = [];

  return makeRequest().then((res) => {
    if (parseRes(res)) return inventory;

    if (res.total_inventory_count > 5000 && res.last_assetid) {
      let requestChain = Promise.resolve(res.last_assetid);

      for (let i = 0; i < Math.ceil(res.total_inventory_count / 5000) - 1; i++) {
        requestChain = requestChain.then((lastAssetId) => {
          return makeRequest(lastAssetId);
        }).then((res) => {
          if (parseRes(res)) return inventory;
          return res.last_assetid ? res.last_assetid : inventory;
        });
      }

      return requestChain;
    }
    return inventory;
  });
};
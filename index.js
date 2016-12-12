'use strict';

let request = require('request-promise-native');
//CEconItem from 'McKay's steam packages
let CEconItem = require('./CEconItem.js');

exports.getInventory = (steamid, appid, contextid, tradableOnly, proxy) => {
	let inventory = [];

	return request({
		url: 'http://steamcommunity.com/inventory/'+steamid+'/'+appid+'/'+contextid+'?l=english&count=5000',
		proxy: proxy,
		json: true
	}).then((res) => {
		if (res.success && res.total_inventory_count === 0) return inventory;
		if (!res || !res.success || !res.assets || !res.descriptions) throw 'Malformed response';

		for (let item in res.assets) {
			  if(!res.assets.hasOwnProperty(item)) continue;
			  const generatedItem = new CEconItem(res.assets[item], res.descriptions, contextid);
			  if (!tradableOnly || generatedItem.tradable) inventory.push(generatedItem);
		}

		if (res.total_inventory_count < 5000) {
			return inventory;
		} else if (res.total_inventory_count > 5000 && res.last_assetid){
			let requestChain = Promise.resolve(res.last_assetid);

			for (let i = 0; i < Math.ceil(res.total_inventory_count / 5000) - 1; i++) {
				requestChain = requestChain.then((lastAssetId) => {
					return request({
						url: 'http://steamcommunity.com/inventory/'+steamid+'/'+appid+'/'+contextid+'?l=english&count=5000&start_assetid='+lastAssetId,
						proxy: proxy || undefined,
						json: true
					});
				}).then((res) => {
					if (!res || !res.success || !res.assets || !res.descriptions) throw 'Malformed response';

					for (let item in res.assets) {
						  if(!res.assets.hasOwnProperty(item)) continue;
						  const generatedItem = new CEconItem(res.assets[item], res.descriptions, contextid);
						  if (!tradableOnly || generatedItem.tradable) inventory.push(generatedItem);
					}

					return res.last_assetid ? res.last_assetid : inventory;
				});
			}

			return requestChain;
		}
	})
};

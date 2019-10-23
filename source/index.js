const request = require('request-promise-native');
const parseItem = require('./parse.js');
const rotate = require('./rotate.js');

const InventoryApi = module.exports = {
  init({
    id,
    proxy,
    proxyRepeat = 1,
    maxUse = 25,
	requestInterval = 60 * 1000,
	SteamApisKey = null
  }) {
    this.id = id;
    this.useProxy = !!proxy;
    if (typeof proxy === 'object') this.proxyList = proxy;
    else this.proxyList = [proxy];
    this.proxy = rotate(this.proxyList, proxyRepeat);
    this.maxUse = maxUse;
    this.recentRequests = 0;
	this.recentRotations = 0;
	this.SteamApisKey = SteamApisKey;
    setInterval(() => {
      this.recentRequests = this.recentRotations = 0;
    }, requestInterval)
  },
  size({
    appid,
    contextid,
    steamid,
    retries,
  }) {
    return this.get({
      appid,
      contextid,
      steamid,
      retries,
      count: 1,
    })
    .then(res => res.total);
  },
  get({
    appid,
    contextid,
    steamid,
    start,
    result,
    count = 5000,
    retries = 1,
    retryDelay = 0,
    language = 'english',
    tradable = true,
    retryFn = () => true,
  }) {
    //if (this.recentRotations >= this.maxUse) return Promise.reject('Too many requests');

	let url;
	if (this.SteamApisKey)
		url = `https://api.steamapis.com/steam/inventory/${steamid}/${appid}/${contextid}?api_key=${this.SteamApisKey}${start ? `&start_assetid=${start}` : ''}`;
	else
		url = `https://steamcommunity.com/inventory/${steamid}/${appid}/${contextid}?l=${language}&count=${count}${start ? `&start_assetid=${start}` : ''}`;
	const options = {
      url,
      json: true,
      proxy: this.useProxy ? this.proxy() : undefined,
    };

    this.recentRequests += 1;
    this.recentRotations = Math.floor(this.recentRequests / this.proxyList.length);

    const makeRequest = () => {
      console.log(`Requesting. Start ${start}, Retries ${retries}, Retry Delay ${retryDelay}, Items ${result ? result.items.length : 0}`);
      return request(options)
      .then((res) => {
        // May throw 'Malformed Response'
        result = this.parse(res, result, contextid, tradable);
      })
      .catch((err) => {
        // TODO: Don't throw for private inventory etc.
        console.log('Retry error, failed on proxy', options.proxy);
        if (retries > 1) {
		  options.proxy = this.useProxy ? this.proxy() : undefined;
          console.log(`Retrying. Start ${start}, Retries ${retries}, Proxy ${options.proxy}, Items ${result ? result.items.length : 0}`);
          this.recentRequests += 1;
          this.recentRotations = Math.floor(this.recentRequests / this.proxyList.length);
          retries -= 1;
          console.log(`${retries} Retries remaining`);
          return new Promise((resolve, reject) => setTimeout(resolve, retryDelay))
          .then(() => makeRequest);
        } else {
          throw err;
        }
      });
    }

    return makeRequest()
    .then((res) => {
      if (result && result.more_items && retryFn(result))
          start = result.last_assetid;
      if (!result || (result.more_items && retryFn(result)))
        return this.get({
          appid: appid,
          contextid: contextid,
          steamid: steamid,
          start: start,
          result: result,
          count: count,
          retries: retries,
          retryDelay: retryDelay,
          language: language,
          tradable: tradable
        });
      return result;
    });
  },
  parse(
    res,
    progress,
    contextid,
    tradable,
  ) {
    const parsed = progress ? progress : {
      items: [],
      total: 0,
    };
    if (res.success && res.total_inventory_count === 0) return parsed;
    if (!res || !res.success || !res.assets || !res.descriptions) throw 'Malformed response';

    if (res.more_items) {
      parsed.more_items = res.more_items;
      parsed.last_assetid = res.last_assetid;
    } else {
      delete parsed.more_items;
      delete parsed.last_assetid;
    }
    
    parsed.total = res.total_inventory_count;
    for (let item in res.assets) {
      const parsedItem = parseItem(res.assets[item], res.descriptions, contextid);
      if (!tradable || parsedItem.tradable) parsed.items.push(parsedItem);
      else parsed.total--;
    }

    return parsed;
  },
};

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
  }) {
    this.id = id;
    this.useProxy = !!proxy;
    if (typeof proxy === 'object') this.proxyList = proxy;
    else this.proxyList = [proxy];
    this.proxy = rotate(this.proxyList, proxyRepeat);
    this.maxUse = maxUse;
    this.recentRequests = 0;
    this.recentRotations = 0;
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
    if (this.recentRotations >= this.maxUse) return Promise.reject('Too many requests');


    const url = `http://steamcommunity.com/inventory/${steamid}/${appid}/${contextid}` +
      `?l=${language}&count=${count}${start ? `&start_assetid=${start}` : ''}`;
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
        console.log('Retry error', err);
        if (retries > 1) {
          console.log(`Retrying. Start ${start}, Retries ${retries}, Proxy ${options.proxy}, Items ${result ? result.items.length : 0}`);
          options.proxy = this.useProxy ? this.proxy() : undefined;
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
      if (
        result.items.length < result.total &&
        retryFn(result)
      ) {
        start = result.items[result.items.length - 1].assetid;
        return this.get({
          appid,
          contextid,
          steamid,
          start,
          result,
          retries,
          retryDelay,
          language,
          tradable,
        });
      }

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

    parsed.total = res.total_inventory_count;
    for (let item in res.assets) {
      const parsedItem = parseItem(res.assets[item], res.descriptions, contextid);
      if (!tradable || parsedItem.tradable) parsed.items.push(parsedItem);
      else parsed.total--;
    }

    return parsed;
  },
};

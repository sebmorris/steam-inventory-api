'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var request = require('request-promise-native');
var parseItem = require('./parse.js');
var rotate = require('./rotate.js');

var InventoryApi = module.exports = {
  init: function init(_ref) {
    var _this = this;

    var id = _ref.id,
        proxy = _ref.proxy,
        _ref$proxyRepeat = _ref.proxyRepeat,
        proxyRepeat = _ref$proxyRepeat === undefined ? 1 : _ref$proxyRepeat,
        _ref$maxUse = _ref.maxUse,
        maxUse = _ref$maxUse === undefined ? 25 : _ref$maxUse,
        _ref$requestInterval = _ref.requestInterval,
        requestInterval = _ref$requestInterval === undefined ? 60 * 1000 : _ref$requestInterval,
        _ref$SteamApisKey = _ref.SteamApisKey,
        SteamApisKey = _ref$SteamApisKey === undefined ? null : _ref$SteamApisKey,
        _ref$requestTimeout = _ref.requestTimeout,
        requestTimeout = _ref$requestTimeout === undefined ? 9000 : _ref$requestTimeout;

    this.id = id;
    this.useProxy = !!proxy;
    if ((typeof proxy === 'undefined' ? 'undefined' : _typeof(proxy)) === 'object') this.proxyList = proxy;else this.proxyList = [proxy];
    this.proxy = rotate(this.proxyList, proxyRepeat);
    this.maxUse = maxUse;
    this.recentRequests = 0;
    this.recentRotations = 0;
    this.SteamApisKey = SteamApisKey;
    this.requestTimeout = requestTimeout;
    setInterval(function () {
      _this.recentRequests = _this.recentRotations = 0;
    }, requestInterval);
  },
  size: function size(_ref2) {
    var appid = _ref2.appid,
        contextid = _ref2.contextid,
        steamid = _ref2.steamid,
        retries = _ref2.retries;

    return this.get({
      appid: appid,
      contextid: contextid,
      steamid: steamid,
      retries: retries,
      count: 1
    }).then(function (res) {
      return res.total;
    });
  },
  get: function get(_ref3) {
    var _this2 = this;

    var appid = _ref3.appid,
        contextid = _ref3.contextid,
        steamid = _ref3.steamid,
        start = _ref3.start,
        result = _ref3.result,
        _ref3$count = _ref3.count,
        count = _ref3$count === undefined ? 5000 : _ref3$count,
        _ref3$retries = _ref3.retries,
        retries = _ref3$retries === undefined ? 1 : _ref3$retries,
        _ref3$retryDelay = _ref3.retryDelay,
        retryDelay = _ref3$retryDelay === undefined ? 0 : _ref3$retryDelay,
        _ref3$language = _ref3.language,
        language = _ref3$language === undefined ? 'english' : _ref3$language,
        _ref3$tradable = _ref3.tradable,
        tradable = _ref3$tradable === undefined ? true : _ref3$tradable,
        _ref3$retryFn = _ref3.retryFn,
        retryFn = _ref3$retryFn === undefined ? function () {
      return true;
    } : _ref3$retryFn;

    //if (this.recentRotations >= this.maxUse) return Promise.reject('Too many requests');

    var url = void 0;
    if (this.SteamApisKey) url = 'https://api.steamapis.com/steam/inventory/' + steamid + '/' + appid + '/' + contextid + '?api_key=' + this.SteamApisKey + (start ? '&start_assetid=' + start : '');else url = 'https://steamcommunity.com/inventory/' + steamid + '/' + appid + '/' + contextid + '?l=' + language + '&count=' + count + (start ? '&start_assetid=' + start : '');
    var options = {
      url: url,
      json: true,
      proxy: this.useProxy ? this.proxy() : undefined,
      timeout: this.requestTimeout
    };

    this.recentRequests += 1;
    this.recentRotations = Math.floor(this.recentRequests / this.proxyList.length);

    var makeRequest = function makeRequest() {
      console.log('Requesting. Start ' + start + ', Retries ' + retries + ', Retry Delay ' + retryDelay + ', Items ' + (result ? result.items.length : 0));
      return request(options).then(function (res) {
        // May throw 'Malformed Response'
        result = _this2.parse(res, result, contextid, tradable);
      }).catch(function (err) {
        // TODO: Don't throw for private inventory etc.
        console.log('Retry error, failed on proxy', options.proxy);
        if (retries > 1) {
          options.proxy = _this2.useProxy ? _this2.proxy() : undefined;
          console.log('Retrying. Start ' + start + ', Retries ' + retries + ', Proxy ' + options.proxy + ', Items ' + (result ? result.items.length : 0));
          _this2.recentRequests += 1;
          _this2.recentRotations = Math.floor(_this2.recentRequests / _this2.proxyList.length);
          retries -= 1;
          console.log(retries + ' Retries remaining');
          return new Promise(function (resolve, reject) {
            return setTimeout(resolve, retryDelay);
          }).then(function () {
            return makeRequest;
          });
        } else {
          throw err;
        }
      });
    };

    return makeRequest().then(function (res) {
      if (result && result.more_items && retryFn(result)) start = result.last_assetid;
      if (!result || result.more_items && retryFn(result)) return _this2.get({
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
  parse: function parse(res, progress, contextid, tradable) {
    var parsed = progress ? progress : {
      items: [],
      total: 0
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
    for (var item in res.assets) {
      var parsedItem = parseItem(res.assets[item], res.descriptions, contextid);
      if (!tradable || parsedItem.tradable) parsed.items.push(parsedItem);else parsed.total--;
    }

    return parsed;
  }
};
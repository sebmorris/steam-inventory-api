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
        requestInterval = _ref$requestInterval === undefined ? 60 * 1000 : _ref$requestInterval;

    this.id = id;
    this.useProxy = !!proxy;
    if ((typeof proxy === 'undefined' ? 'undefined' : _typeof(proxy)) === 'object') this.proxyList = proxy;else this.proxyList = [proxy];
    this.proxy = rotate(this.proxyList, proxyRepeat);
    this.maxUse = maxUse;
    this.recentRequests = 0;
    this.recentRotations = 0;
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

    if (this.recentRotations >= this.maxUse) return Promise.reject('Too many requests');

    var url = 'http://steamcommunity.com/inventory/' + steamid + '/' + appid + '/' + contextid + ('?l=' + language + '&count=' + count + (start ? '&start_assetid=' + start : ''));
    var options = {
      url: url,
      json: true,
      proxy: this.useProxy ? this.proxy() : undefined
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
        console.log('Retry error', err);
        if (retries > 1) {
          console.log('Retrying. Start ' + start + ', Retries ' + retries + ', Proxy ' + options.proxy + ', Items ' + (result ? result.items.length : 0));
          options.proxy = _this2.useProxy ? _this2.proxy() : undefined;
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
      if (result.items.length < result.total && retryFn(result)) {
        start = result.items[result.items.length - 1].assetid;
        return _this2.get({
          appid: appid,
          contextid: contextid,
          steamid: steamid,
          start: start,
          result: result,
          retries: retries,
          retryDelay: retryDelay,
          language: language,
          tradable: tradable
        });
      }

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

    parsed.total = res.total_inventory_count;
    for (var item in res.assets) {
      var parsedItem = parseItem(res.assets[item], res.descriptions, contextid);
      if (!tradable || parsedItem.tradable) parsed.items.push(parsedItem);else parsed.total--;
    }

    return parsed;
  }
};
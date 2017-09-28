"use strict";

module.exports = function (arr, repeat) {
  var pos = 0;
  var repeats = 0;
  return function () {
    if (pos > arr.length - 1) pos = 0;
    if (repeats >= repeat) {
      repeats = 0;
      return arr[pos++];
    } else {
      repeats++;
      return arr[pos];
    }
  };
};
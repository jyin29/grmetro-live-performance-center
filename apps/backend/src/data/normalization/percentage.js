"use strict";

const { isFiniteValue } = require("./missingData");

function ratioToPercentage(value) {
  return isFiniteValue(value) ? value * 100 : null;
}

module.exports = { ratioToPercentage };

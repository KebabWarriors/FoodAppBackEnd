const {scalarBooleanOrStringOrInt} = require("./booleanOrStringOrInt.js");
const {scalarDateTime} = require("./utcDateTime.js");

const myScalarsNames = `
  scalar ScalarBooleanOrStringOrInt

  scalar ScalarDateTime

`;

const myScalars = {
  ScalarBooleanOrStringOrInt: scalarBooleanOrStringOrInt,
  ScalarDateTime: scalarDateTime
}

module.exports = {
  myScalars,
  myScalarsNames
}

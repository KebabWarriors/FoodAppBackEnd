const { GraphQLScalarType, Kind } = require('graphql');

const scalarBooleanOrStringOrInt = new GraphQLScalarType({
  name: 'ScalarBooleanOrStringOrInt',
  description: 'Optional escalar when you recive',
  serialize(value){
    if(typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
      throw new Error("scarlarBooleanOrStringOrInt must be either a String, number or boolean");
    if(typeof value === "number" && !Number.isInteger(value))
      throw new Error("scarlarBooleanOrStringOrInt must be an Integer, sorry for the inconvenients");
    return value;
  },
  parseValue(value){
    if(typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
      throw new Error("scarlarBooleanOrStringOrInt must be either a String, number or boolean");
    if(typeof value === "number" && !Number.isInteger(value))
      throw new Error("scarlarBooleanOrStringOrInt must be an Integer, sorry for the inconvenients");
    return value;
  }, 
  parseLiteral(result){
    switch(result.Kind){
      case Kind.INT:
        return parseInt(result.value);
      case Kind.STRING:
        return result.value;
      case Kind.BOOLEAN:
        return (result.value == 'true') ? true : false;
    }
  }
});

module.exports = {
  scalarBooleanOrStringOrInt
}
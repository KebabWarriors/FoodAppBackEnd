const { GraphQLScalarType, Kind } = require('graphql');

const validateUTCTime = (dateToVerify) => {
  if(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(dateToVerify)){
    return false;
  }
  let tempDate = new Date(dateToVerify);
  return tempDate.ToISOString() === dateToVerify;
};

const scalarDateTime = new GraphQLScalarType({
  name:  'ScalarDateTime',
  description: 'Date Time Scalar on UTC format',
  serialize(value){
    if(typeof value !== "string" && !validateUTCTime(value))
      throw new Error("scalarDateTime must be a string and it must be on UTC format");
    return value;
  },
  parseValue(value){
    if(typeof value !== "string" && !validateUTCTime(value))
      throw new Error("scalarDateTime must be a string and it must be on UTC format");
    return value;
  },
  parseLiterl(result){
    switch(result.Kind){
      case Kind.STRING:
        console.log(result.value);
        return new Date(result.value).ToISOString();
    }
  }
});

module.exports = {
  scalarDateTime
}
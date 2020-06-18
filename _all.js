const { typeDefs: usersSchema, resolvers: usersResolver } = require('./modules/Users');
const { typeDefs: restaurantsSchema, resolvers: restaurantsResolver } = require('./modules/Restaurants');
const { typeDefs: itemsSchema, resolvers: itemsResolver } = require('./modules/Items');
const { typeDefs: deliverySchema, resolvers: deliveryResolver } = require('./modules/Delivery');
const { gql } = require('apollo-server-lambda');


const typeDefs = gql`
  ${usersSchema}
  ${restaurantsSchema}
  ${itemsSchema}
  ${deliverySchema}
`;

const resolvers = {
  Query:{
    ... usersResolver.Query,
    ... restaurantsResolver.Query,
    ... itemsResolver.Query,
    ... deliveryResolver.Query
  },
  Mutation:{
    ... usersResolver.User,
    ... restaurantsResolver.Restaurant,
    ... itemsResolver.Items,
    ... deliveryResolver.Delivery
  }
}

module.exports = {
  typeDefs,
  resolvers
}


const { typeDefs: usersSchema, resolvers: usersResolver } = require('./modules/Users');
const { typeDefs: restaurantsSchema, resolvers: restaurantsResolver } = require('./modules/Restaurants');
const { typeDefs: itemsSchema, resolvers: itemsResolver } = require('./modules/Items');
const { gql } = require('apollo-server-lambda');


const typeDefs = gql`
  ${usersSchema}
  ${restaurantsSchema}
  ${itemsSchema}
`;

const resolvers = {
  Query:{
    ... usersResolver.Query,
    ... restaurantsResolver.Query,
    ... itemsResolver.Query
  },
  Mutation:{
    ... usersResolver.User,
    ... restaurantsResolver.Restaurant,
    ... itemsResolver.Items
  }
}

module.exports = {
  typeDefs,
  resolvers
}


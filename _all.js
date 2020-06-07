const { typeDefs: usersSchema, resolvers: usersResolver } = require('./modules/Users');
const { typeDefs: restaurantsSchema, resolvers: restaurantsResolver } = require('./modules/Restaurants');
const { gql } = require('apollo-server-lambda');


const typeDefs = gql`
  ${usersSchema}
  ${restaurantsSchema}
`;

const resolvers = {
  Query:{
    ... usersResolver.Query,
    ... restaurantsResolver.Query
  },
  Mutation:{
    ... usersResolver.User,
    ... restaurantsResolver.Restaurant
  }
}

module.exports = {
  typeDefs,
  resolvers
}


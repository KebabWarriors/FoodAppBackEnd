const { ApolloServer } = require('apollo-server-lambda');

const server = new ApolloServer({
  modules:[
    require('./_all.js'),
  ]
});

exports.graphqlHandler = server.createHandler();
const {ApolloServer} = require('apollo-server-lambda');

const server = new ApolloServer({
  modules:[
    require('./modules/Users')
  ]
});

exports.graphqlHandler = server.createHandler();
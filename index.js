const { ApolloServer } = require('apollo-server-lambda');

const server = new ApolloServer({
  modules:[
    require('./_all.js'),
  ],
  playground: {
    endpoint: "/dev/graphql"
  },
  context: ({ event, context }) => ({
        headers: event.headers,
        functionName: context.functionName,
        event,
        context,
    }),
});

exports.graphqlHandler = server.createHandler();




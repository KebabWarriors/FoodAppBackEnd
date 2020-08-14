const { ApolloServer } = require('apollo-server-lambda');
const {typeDefs, resolvers} = require('./_all.js');

const server = new ApolloServer({
  typeDefs,
  resolvers,
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

const withCors = handler => (req, res, ...args) => {
  if (req.method === 'OPTIONS'){
    // add required headers here
    res.end()
  }
  else {
    return handler(req, res, ...args)
  }
}



exports.graphqlHandler = withCors(server.createHandler({
  cors: {
    origin: '*',
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type','content-type' ,'Origin', 'Accept',"token","authorization","Authorization"],
    credentials: true,
  },
}));




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

const withCors = handler => (req, res, ...args) => {
  if (req.method === 'OPTIONS')
    // add required headers here
    res.end()
  else {
    return handler(req, res, ...args)
  }
}



exports.graphqlHandler = withCors(server.createHandler({
  cors: {
    origin: '*',
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type', 'Origin', 'Accept'],
    credentials: true,
  },
}));




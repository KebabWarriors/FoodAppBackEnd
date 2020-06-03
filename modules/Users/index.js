const neo4j  =  require("neo4j-driver");
const { gql} = require('apollo-server-lambda');
const encrypt = require('crypto');


const driver = neo4j.driver(
  'neo4j://localhost:7687',
  neo4j.auth.basic('neo4j', '123456')
);



const typeDefs = gql`
  type Person{
    id: ID
    name: String
    email: String
    password: String
    phone: String
  }

  type Address{
    streetAddress: String
    build: String
    door: String
  }

  extend type Query{
    person(id: ID): Person 
  }

  type Mutation{
    addPerson(name: String, email: String, password: String,phone:String): Person
  }
`;

const resolvers = {
  Query:{
    person: async (parent,args,context,info) => {
      const session = driver.session();
      let response = {}
      const result =  await session.run(
        'MATCH (p:person) where ID(p) = $id return p',
        {id: parseInt(args.id)}
      ).then(async(result) =>{
        await session.close();
        if(result.records.length > 0)
          response = {id: result.records[0]._fields[0].identity.low,...result.records[0]._fields[0].properties}
      });
      return response;
    },
    
  },
  Mutation:{
    addPerson: async (parent, args) => {
      let person = {};
      
      
      const session = driver.session();
      let self = this;
        const result = await session.run(
          'CREATE (a:person {name: $name,email: $email,password:$password,phone:$phone}) return ID(a) as id',
          {name: args.name, email: args.email,password: args.password,phone: args.phone}
        ).then(async (result) => {
          await session.close();
          
          person = {
            id: result.records[0].get('id').low,
            name: args.name, 
            email: args.email,
            password: args.password,
            phone: args.phone
          };
          return person;
        }).catch((error) =>{
          return  {id: 0,name: "error", email: "error",password: "error",phone: "error"}
        });
        return person;
    }
  }
};

// on application exit:


module.exports = {
  typeDefs,
  resolvers
}
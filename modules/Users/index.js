const encrypt = require('crypto');
const { driver } = require('../../conf/connection.js');


const typeDefs = `
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
    people: [Person]
  }

  extend type Mutation{
    addPerson(name: String, email: String, password: String,phone:String): Person
    updatePerson(id: ID!,name: String, email: String, password: String,phone:String): Person
  }
`;

const resolvers = {
  Query:{
    person: async (parent,args,context,info) => {
      const session = driver.session();
      let response = {}
      const result =  await session.run(
        'MATCH (p:person) where p.id = $id return p',
        {id: args.id}
      ).then(async(result) =>{
        await session.close();
        if(result.records.length > 0)
          response = {...result.records[0]._fields[0].properties}
      });
      return response;
    },
    people: async () => {
      const session = driver.session();
      let response = [];
      const result = await  session.run(
          'MATCH (p:person) return p',
          {}
        ).then(async (result) => {
          await session.close();
          result.records.forEach((value, key) => {
            response.push({...value._fields[0].properties});
          });
          //console.log(result)
        }).catch((error) => {
          console.log(`error ${error}`);
        });
        return response;
    }

    
  },
  User:{
    addPerson: async (parent, args) => {
      let person = {};
      
      
      const session = driver.session();
        const result = await session.run(
          'CREATE (a:person {id: randomUUID(),name: $name,email: $email,password:$password,phone:$phone}) return a',
          {name: args.name, email: args.email,password: args.password,phone: args.phone}
        ).then(async (result) => {
          await session.close();
          //console.log(result.records[0]._fields[0].properties);
          person = result.records[0]._fields[0].properties;
        }).catch((error) =>{
          return  {id: 0,name: "error", email: "error",password: "error",phone: "error"}
        });
        return person;
    },
    updatePerson: async (parent, args) => {
      const session = driver.session();
      let query = "";
      let params = {id: args.id};
      let response = {};

      if(args.name != undefined){
        query += `p.name = $name`;
        params.name = args.name;
      }

      if(args.email != undefined){
        query += `p.email = $email`;
        params.email = args.email;
      }

      if(args.password != undefined){
        query += `p.password = $password`;
        params.password = args.password;
      }

      if(args.phone != undefined){
        query += `p.phone = $phone`;
        params.phone = args.phone;
      }

      const result = await session.run(
        `MATCH (p:person) where p.id = $id set ${query} return p`,
        params
      ).then( async (result) => {
        await session.close();
        if(result.records.length > 0)
          response = {...result.records[0]._fields[0].properties}
      }).catch((error) => {
        console.log(`error: ${error}`);
      });
      return response;
    }
  }
};

// on application exit:


module.exports = {
  typeDefs,
  resolvers
}
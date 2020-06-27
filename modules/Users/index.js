const { driver } = require('../../conf/connection.js');
const {Lambda} = require('aws-sdk');
const dotenv = require("dotenv");



dotenv.config();



const typeDefs = `
  type Person{
    id: ID
    name: String
    email: String
    phone: String
  }

  type Address{
    streetAddress: String
    build: String
    door: String
    latitude: String
    longitude: String
  }

  input NewUser{
    name: String
    email: String
    phone: String
    password: String
  }

  extend type Query{
    person(id: ID): Person 
    people: [Person]
    login: Person
  }

  extend type Mutation{
    addPerson(name: String, email: String, password: String,phone:String): Person
    updatePerson(id: ID!,name: String, email: String, password: String,phone:String): Person
    addAddressToPerson(person: ID,address: String,build: String,door:String): Address 
    signPerson(person: NewUser): Person
  }
`;

const resolvers = {
  Query:{
    person: async (parent,args,context,info) => {
      console.log(`person: ${args}`);
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
    people: async (parent,args) => {
      console.log(`people: ${args}`);
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
    },
    

    
  },
  User:{
    addPerson: async (parent, args) => {
      console.log(`addPerson: ${args}`);
      let person = {};
      
      
      const session = driver.session();
        const result = await session.run(
          'CREATE (a:person {id: randomUUID(),name: $name,email: $email,phone:$phone}) return a',
          {name: args.name, email: args.email,phone: args.phone}
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
      console.log(`updatePerson: ${args}`);
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
    },
    addAddressToPerson: async (parent, args)=>{
      let newAddress;
      let tempAddress;
      let url = encodeURI(`${args.address}`);
      const getLatAndLng = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${url}&key=AIzaSyASuTepGP3k9VxIPOO0cbnymrKINq3mI0c`,{
        method: 'GET',
        headers:{
          "ContentType": "application/json"
        }
      }).then(response => response.json()).then((result) =>{
        newAddress = result;
        
      });
      
      const session = driver.session();
      let response = {};

      const verifyLocation = await session.run(
        `
          match (a:address) where a.latitude = $lat and a.longitude = $lon
          return a 
        `,
        {
          lat: newAddress.results[0].geometry.location.lat.toString(),
          lon: newAddress.results[0].geometry.location.lng.toString()
        }
      ).then((result)=>{
        tempAddress = result;
      });
      console.log(tempAddress.records)
      if(tempAddress.records.length > 0){
        console.log(newAddress.records);
          const createNewRelationship = await session.run(
            `
              match (p:person) where p.id = $id
              with p
              match (a:address) where a.id = $address
              with a,p
              merge (p)-[:HAS]->(a)
              return a    
            `,
            {
              id: args.person,
              address: tempAddress.records[0]._fields[0].properties.id
            }
          ).then(async (result)=>{
            await session.close();
            response = result.records[0]._fields[0].properties;  
          });
      }else{
        const createNewAddress = await session.run(`
          create (a:address{id:randomUUID(),latitude: $lat,longitude:$lon,build:$build,door:$door,address:$address})
          with a
          match (p:person) where p.id = $id
          with a,p
          merge (p)-[:HAS]->(a)
          return a
        `,
        {
          lat: newAddress.results[0].geometry.location.lat.toString(),
          lon: newAddress.results[0].geometry.location.lng.toString(),
          build: args.build,
          door: args.door,
          id: args.person,
          address: args.address
        }).then(async (result)=>{
          await session.close();
          response = result.records[0]._fields[0].properties;
        });
      }
        return response;  

      
    }
  }
};

// on application exit:


module.exports = {
  typeDefs,
  resolvers
}
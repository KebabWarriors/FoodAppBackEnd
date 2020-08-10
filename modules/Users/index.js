const { driver } = require('../../conf/connection.js');
const aws = require('aws-sdk');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const dotenv = require("dotenv");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_KEY);
const fetch = require('cross-fetch');
dotenv.config();


const poolData = {
  UserPoolId : process.env.COGNITO_USER_POOL_ID,
  ClientId: process.env.COGNITO_USER_POOL_CLIENT
}

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

const typeDefs = `
  type Person{
    id: ID
    name: String
    lastname: String
    dui: String
    address: String
    email: String
    verified: Boolean
    phone: String
    costumerId: String
  }

  type Address{
    streetAddress: String
    build: String
    door: String
    latitude: String
    longitude: String
    id: ID
    name: String
  }

  type Cards{
    id: ID
    lastDigits: Int
    type: String
  }

  input NewUser{
    name: String
    email: String
    phone: String
    
  }

  extend type Query{
    person(id: ID): Person 
    personByEmail(email: String): Person
    people: [Person]
    drivers: [Person]
    verifyUser(email: String): Boolean
    login: Person
    cardsByUser(id: ID): [Cards]
    addressByUser(id: ID): [Address]
  }

  extend type Mutation{
    addPerson(id:ID): Person
    addDriver(email: String!, name: String!, lastname: String!, dui: String!,address: String!, phone: String!): Person 
    updatePerson(id: ID!,name: String, email: String, password: String,phone:String): Person
    addAddressToPerson(person: ID,address: String,build: String,door:String): Address 
    updateAddress(id: ID!, streetAddress: String, build: String, door: String, latitude: String, logintude: String): Address
    signPerson(person: NewUser): Person
    confirmUser(email: String): Person
    addCardToPerson(id: String,cardNumber: String,expMonth:Int,expYear:Int,cvc: Int,name: String): Cards
    deleteAddress(person:String,address:String): Boolean
    setDriverOnline(id:String,location:[Float]): String
 }
 
`;

const resolvers = {
  Query:{
    person: async (parent,args,context,info) => {
      console.log(`person: ${args}`);
      const session = driver.session();
      let response = {}
      const result =  await session.run(
        'match (p:person) where p.id = $id return p',
        {id: args.id}
      ).then(async(result) =>{
        await session.close();
        if(result.records.length > 0)
          response = {...result.records[0]._fields[0].properties}
      });
      return response;
    },
    personByEmail: async (parent,args,context,info) => {
      console.log(`person: ${JSON.stringify(args)}`);
      const session = driver.session();
      let response = {}
      const result =  await session.run(
        'match (p:person) where p.email = $email return p',
        {email: args.email}
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
          'match (p:person) return p',
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
    verifyUser: async (parent,args) => {
	    console.log(`Verify users`);
	    const session = driver.session();
  	  let response = false;
	    const result = await session.run(`
	      match (p:person) where p.email = $email and p.verified = true return p
	    `,{
	        email: args.email
	      }).then(async (res)=>{
	        if(res.records.length > 0){
	  	      response = true
	        }
	      }).catch((error) => console.log(JSON.stringify(error)));
	      return response;
    },
    drivers: async (parent,args) => {
      console.log(`people: ${args}`);
      const session = driver.session();
      let response = [];
      const result = await  session.run(
          'MATCH (p:person) where p.type = 2 return p',
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
    cardsByUser: async (parent, args,context,info) => {
      console.log(`cards`);
      console.log(JSON.stringify(args));
      //console.log(`token ${JSON.stringify(context.headers.authorization.split(" ")[1])}`);
      const token = context.headers.authorization.split(" ")[1];
      let userId = null;
      const userToken = await fetch(`${process.env.TOKEN_VERIFICATION_URL}`,{
      	method: 'POST',
        headers:{
          "token": token
      	}
      }).then((response) => response.json()).then((result)=>{
	        userId = result;
	        //console.log(result);
      }).catch(error => console.log(`ERROR ${error}`));
      const session = driver.session();
      let response = [];
      const result = await session.run(
        `match (c:card)<-[]-(p:person) where p.id = $id return c`,
        {id: userId}
      ).then(async (result) =>{
        await session.close();
        result.records.forEach((value,item)=>{
          response.push({...value._fields[0].properties})
        });
      });
      return response;
    },
    addressByUser: async (parent, args,context,info) => {
      console.log(`address`);
      console.log(`HEADERS ${JSON.stringify(context.headers)}`)
      console.log(`token ${JSON.stringify(context.headers.Authorization.split(" ")[1])}`);
      let token;
      if(context.headers.Authorization){
      token = context.headers.Authorization.split(" ")[1];
      }else{
       token = context.headers.authorization.split(" ")[1]; 
      }
      let userId = null;
      const userToken = await fetch(`${process.env.TOKEN_VERIFICATION_URL}`,{
	      method: 'POST',
        headers:{
          "token": token,
           'Content-Type': 'application/json'
      	},
	        body:JSON.stringify({token:token})
      }).then((response) => {
	      console.log(`Data: ${JSON.stringify(response)}`); 
	      return response.json(); 
	    }).then((result)=>{
	        console.log(`result ${JSON.stringify(result)}`);
	        userId = result;
      }).catch(error => console.log(`ERROR ${error}`));
	    console.log(`USERID ${JSON.stringify(userId)}`);
      const session = driver.session();
      let response = [];
      const result = await session.run(
        `match (p:person)-[]->(a:address) where p.id = $id return a`,
        {id: userId}
      ).then(async (result) =>{
        await session.close();
        result.records.forEach((value,item)=>{
	        console.log(`data: ${value._fields[0].properties}`);
          response.push({...value._fields[0].properties})
        });
      });
      return response;
    }
  },
  User:{
    addPerson: async (parent, args) => {
      console.log(`addPerson: ${args}`);
      let person = {};
      let myCostumer  = {}
     	stripe.costumers.create({
		    name: args.id
     	}, (error, costumer) =>
	    {
	      if(error){
		      console.log(`ERROR! ${error}`);
	      }
		    myCostumer = costumer;
     	}); 
      
      	const session = driver.session();
        const result = await session.run(
          'CREATE (a:person {id: $id,costumerID: $costumer, type: 1}) return a',
          {
	          id: args.id,
	          costumer: myCostumer.id
	        }
          ).then(async (result) => {
          await session.close();
          //console.log(result.records[0]._fields[0].properties);
          person = result.records[0]._fields[0].properties;
        }).catch((error) =>{
          return  {id: 0,name: "error", email: "error",password: "error",phone: "error"}
        });
        return person;
    },
    addDriver: async (parent,args,context,info) => {
	    console.log('addDrvier');
	    //console.log(JSON.stringify(args));
	    let userId = "";
	    let person = {};
	    const newUser = await fetch(`${process.env.CREATE_DRIVER_URL}`,{
	        method: 'POST',
          body: JSON.stringify({email: args.email,name:args.name})
         }).then((response) => response.json()).then((result)=>{
	        userId = result.uid;
	        console.log(result);
      	}).catch(error => console.log(`ERROR ${error}`));
	      const session = driver.session();
	      const result = await session.run(`CREATE (p:person {
		      id: $id,
		      email: $email,
		      type: 2,
		      name: $name, 
		      lastname: $lastname, 
		      dui: $dui, 
		      address: $address, 
		      phone: $phone
	      }) return p`,
	      {
	        id: userId.userSub,
	        email: args.email,
	        name: args.name,
	        lastname: args.lastname,
	        dui: args.dui,
	        address: args.address,
	        phone: args.phone
	      }).then(async (result) => {
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
    updateAddress: async (parent, args) => {
      const session = driver.session();
      
      console.log(args.name)
      let payload;
       const verifyIfNull = (toCompare,toReturn) =>{
          if(toCompare !== undefined && toCompare !== null){
            console.log("entramos a la condicion")
            return `SET n.${toReturn} = COALESCE(n.${toReturn}, $${toReturn})`;
          }
         else{return ''}
       };
      await session.run(
        `
        MATCH (n:address {id: $id})
        WITH n
        ${verifyIfNull(args.name,'name')}
        ${verifyIfNull(args.streetAddress,'streetAddress')}
        ${verifyIfNull(args.build,'build')}
        ${verifyIfNull(args.door,'door')}
        ${verifyIfNull(args.latitud,'latitud')}
        ${verifyIfNull(args.longitude,'longitude')}
        RETURN (n)
        `,
        {
          id: args.id,
          name: args.name,
          streetAddress: args.streetAddress,
          build: args.build,
          door: args.door,
          latitude: args.latitude,
          longitude: args.longitude
        }
      ).then((result) => {
        if (result.records.length > 0)
          payload = result.records[0]._fields[0].properties;
      })
      .catch((e) => {
        payload = null;

        console.log(e);
      });

      return payload;
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
          create (a:address{id:randomUUID(),latitude: $lat,longitude:$lon,build:$build,door:$door,address:$address,name: $name})
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
          address: args.address,
	        name: args.name
        }).then(async (result)=>{
          await session.close();
          response = result.records[0]._fields[0].properties;
        });
      }
        return response;  
    },
    confirmUser: async (parent,args)=>{
	  console.log(`Confirm User`);
	  const session = driver.session();
	  let response = {};
	  const data = await session.run(`
		  match (p:person) where p.email = $email set p.verified = true return p
	  `,{
	    email: args.email
	  }).then((result) => {
	    response = result.records[0]._fields[0].properties
	  }).catch(error => console.log(`Error ${JSON.stringify(error)}`));
	    return response;
    },
    addCardToPerson: async (parent,args)=>{
	    console.log(`Add Card To user`);
	    //id: String,cardNumber: String,expMonth:Int,expYear:Int,cvc: Int,name: String
	    let user = {};
      let card = {};
      async function createUserOnDb(newCard){
         let tempSession = driver.session();
		        await tempSession.run(`
		          match (p:person) where p.id = $id
		          with p
		          create (c:card{id: randomUUID(),lastDigits:$lastDigits,token: $token, type: $type}) 
		          with p,c
		          create (p)-[:owns]->(c)-[:owner]->(p)
		          return c
		        `,{
		            id: user.id,
		            lastDigits: newCard.card.last4,
	              token: newCard.id,
		            type: newCard.card.brand
		          }).then((result)=>{
                console.log(`RESULTADO ${JSON.stringify(result)}`);
                if(result.records.length > 0){
                  card = result.records[0]._fields[0].properties 
                }
              }); 
      }  
      async function attachUserToCard(tempCard){
        console.log(`CARD ON ATTAHC ${JSON.stringify(tempCard)}`);
         const addCardToCostumer = await stripe.paymentMethods.attach(
		        tempCard.id,
	          {customer: user.customerId},
		       (error, paymentMethod)=>{
		          createUserOnDb(paymentMethod) 
	        });
      }
	    const session = driver.session();
	    const getUserData = await session.run(`match (p:person) where p.id = $id return p`,{
	      id: args.id
	    }).then(async (result)=>{
	      await session.close();
	      if(result.records.length > 0)
	  	      user = result.records[0]._fields[0].properties;
	    }).catch(error => console.log(JSON.stringify(error)));
	
	  try{
	    // Creando nueva cartas
      let tempCard;
	    const newCard = await stripe.paymentMethods.create({
		    type: 'card',
		    card: {
		      number:args.cardNumber,
		      exp_month: args.expMonth,
		      exp_year: args.expYear,
		      cvc: args.cvc
		    },
		    billing_details:{
		      name: args.name
		    }
	    },  (error, paymentMethod)=>{
        console.log(`method ${JSON.stringify(paymentMethod)}`)
          attachUserToCard(paymentMethod); 
	      });
	    //console.log(JSON.stringify(newCard));
	  //Starting to atach new card to costumer
	 
	  return card;
	 /* stripe.customers.createSource(
	    args.id
	  );*/
	}
	catch(error){
	  console.log(error);
	}
	/*const data =  await session.run(`
		
	`);*/
    },
    deleteAddress: async (parent,args)=>{
      const session = driver.session();
      let response = false;  
      const deleteData = await session.run(`match (p:person)-[s]->(a:address) where p.id = $person and a.id = $address delete s `,
        {
          person: args.person,
          address: args.address
        }).then((result)=>{
          response = true;
        });
      return response;
    },
    setDriverOnline: async (parent,args)=>{
      let response = {};
        const setDriver =  await fecth(process.env.CREATE_DRIVER_JOB,{
          method: 'GET',
          headers:{
            "ContentType": "application/json"
          },
          body: JSON.stringify({id:args.id,location:args.location})
        }).then((result)=>{
           response.id = result.uid 
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

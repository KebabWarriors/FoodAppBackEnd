const { driver } = require('../../conf/connection.js');
const { verifyToken } = require('../Auth/index.js');
const fetch = require('cross-fetch');
const dotenv = require("dotenv");
dotenv.config();


const typeDefs = `
  
  type Delivery{
    id: ID
    user: Person
    state: Int
    information: String
    total: Float
    date: String
    type: Int
    card: Cards
    restaurant: Restaurant
    address: Address
  }

  type MultipleDelivery{
    id: ID
    user: Person
    state: Int
    information: String
    total: Float
    address: Address
    restaurant: Restaurant
    items: [MultipleDeliveryItemData]
  }

  type MultipleDeliveryItemData{
    id: ID
    item: String
    restrictions: [MultipleDeliveryRestrictions]
  }

  type MultipleDeliveryRestrictions{
    restrictionId: ID
    restrictionType: Int
    restrictionValue: [ScalarBooleanOrStringOrInt]
  }

  # Input for a new delivery starts here

  #input value of restrictions array:
  input DeliveryItemDataRestrictions{
    restrictionId: ID
    restrictionType: Int
    restrictionValue: String
  }

  input DeliveryItemData{
    id: ID
    item: String
    amount: Int
    restrictions: [DeliveryItemDataRestrictions]
  }

  input DeliveryItem{
    user: ID
    restaurant: ID
    address: ID
    items: [DeliveryItemData]
    type: Int
    card: String
  }


  extend type Query{
    delivery(id: ID): Delivery
    deliveriesByUser(user: ID): [MultipleDelivery]
  }

  extend type Mutation{
    addDelivery(items: DeliveryItem): Delivery
  }

`;
const resolvers = {
  Query: {
    deliveriesByUser: async (parent, args) =>{
      console.log("deliveries");
      const session = driver.session();
      let tempArray = [];
      let validator = null;
      const setData = await session.run(`
        match (d:delivery)-[]->(a:address),
        (p:person)-[]->(d)-[]->(p),
        (d)-[]->(di:deliveryItem)-[]->(rdid:restricionDeliveryItemData),
        (d)-[]->(r:restaurant)-[]->(d) where p.id = $id
        return d,a,p,di,rdid,r
      `,{
        id: args.user
      }).then(async (result) => {
        session.close();
        
        result.records.forEach((value,item) => {
         
          tempArray.filter((value2,item2) => {

            if(value2.id === value._fields[0].properties.id){
              
              validator = item2;
            }
          });

          if(validator !== null){
            
            tempArray[validator].items.push({
                ... value._fields[3].properties,
                restrictions: value._fields[4].properties
              });
            validator = null;
          }
          else{
            tempArray.push({
              ... value._fields[0].properties, 
              user: {...value._fields[2].properties},
              address: {... value._fields[1].properties},
              restaurant: {... value._fields[5].properties},
              items: [{
                ... value._fields[3].properties,
                restrictions: value._fields[4].properties
              }],
            })
          }
        });
        tempArray.forEach((value,item)=>{
          
          value.items.forEach((value2,item2)=>{
            value.items.filter((value3,item3)=>{
              if(value2.id === value3.id){
                
              }
            });
            console.log(value2.id)
            console.log(value2.restrictions)
          })
        });
      });
      return tempArray;
    }
  },
  Delivery:{
    addDelivery: async (parent, args,context,info) => {
      console.log("addDelivery");
      let token;
      //Verify if auth cames with lowercase or upper case
      if(context.headers.Authorization !== undefined){
        console.log(`token ${JSON.stringify(context.headers.Authorization.split(" ")[1])}`);
        token = context.headers.Authorization;
      }else{
       token = context.headers.authorization; 
       console.log(`token ${JSON.stringify(context.headers.authorization.split(" ")[1])}`);
      }
      //verify token
      const user = await verifyToken(token);
      //creating hash token
      const hashToken = (string) =>{
        let hash = 0;
        if (string.length === 0)
          return hash;
        for (let i = 0; i < string.length; i++) {
          let charCode = string.charCodeAt(i);
          hash = ((hash << 7) - hash) + charCode;
          hash = hash & hash;
        }
        return hash.toString().replace('-',makeid(1));
      }

      const makeid = (length) => {
        let result = '';
        const characters = 'ABCDEFGHIJKLMOPQRSTUVWXYZ';
        const charactersLength = 28;
        for (let i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
      }

      //getUUID for new Delivery
      let session = driver.session();
       const myUUID = await session.run(`return randomUUID()`,{
         }).then(async (result)=>{
           console.log(`UUID ${JSON.stringify(result.records)}`)
            await session.close();
            return result.records[0]._fields[0];
         });
        
        //My hash to reference

        const myHash = hashToken(`${myUUID} ${new Date().toISOString()}`); 
      

      if(user === null){
        console.log("ERROR AUTH")
        throw new AuthenticationError('must authenticate');
      }
        //First at all we create our firestore delivery
        //step number 1, we create our UUID
        console.log(`UUID ${myUUID}`)
        //step 2, we get the address 
         session = driver.session();

          const myNewAddress = await session.run(`
              match (a:address) where a.id = $id return a
            `,{
                id: args.items.address
            }).then(async (result)=>{
              await session.close();
              console.log(JSON.stringify(result))
              return result.records[0]._fields[0].properties
            });
        
      
        console.log(`direccion ${JSON.stringify(myNewAddress)}`);
        session = driver.session();
        const restaurantData = await session.run(`
            match (r:restaurant)<-[]-(p:person) where r.id = $id return p,r
          `,{id: args.items.restaurant}).then((result)=>{
            return {owner:result.records[0]._fields[0].properties,restaurant:result.records[0]._fields[1].properties};
          });
        
      //Start Processing data
      //We declare an temp array to iterate the repeated values on our get
      let tempArray = [];
      //We will use a validator in the loop for knowing where the value repeats
      let validator = null;
      if(parseInt(args.type) === 1){
	      const sessionCard = driver.session();
	      const userCard = await sessionCard.run(`match (c:card) where c.id = $id return c`,{
	        id: args.card
	      }).then(async function(result){
	        sessionCard.close();
	        return result.records[0]._fields[0].properties;
	      });
      }
      //To know which value repeats we use a function comparing to objects
      const restrictionsValidator = (forComparing, toComparing) =>{
        let isTheSame = true;
        if(forComparing.length > 0){
          for(let value in toComparing){
            console.log(forComparing[value])
            if(JSON.stringify(forComparing[value]) !== JSON.stringify(toComparing[value])){
              isTheSame = false;
              break;
            }
          }
        }
        return isTheSame;
      };

      //then with the data we verify each value we got on the parameters 
      function getRealData(data){
        let toReturn;
        if(data.charAt(0) === "[" && data.charAt(data.length-1) === "]"){
          toReturn = JSON.parse(data.replace(/'/g, '"'))
        }else{
          toReturn = data;
        }
        return toReturn;
      }
      let tempValue;
      args.items.items.forEach((value,key) => {
        tempArray.filter((value2,key2)=>{
          if(value2.id === value.id && restrictionsValidator(value2.restrictions, value.restrictions)){
               
            validator = {
              idChild: key2,
              idParent: key
            }
          }
         
        });
      	  //If we have a repeated value on our object we incremenete de amount of the object  
          tempValue = value;
          console.log(JSON.stringify(tempValue.restrictions)) 
          tempValue.restrictions.forEach((i,index)=>{
              tempValue.restrictions[index].restrictionValue = getRealData(tempValue.restrictions[index].restrictionValue) 
          });
          if(validator !== null){
            
            tempArray[validator.idChild].amount += 1;
            
            validator = null;
          }else{
            tempArray.push({...tempValue});
          }

      });
      //End of processing data

      //step 3, we create on firebase our delivery 
        const createDeliveryFirebase = await fetch(process.env.URL_CREATE_DELIVERY,{
        method: 'POST',
        headers:{
          "Authorization": `Bearer ${context.headers.authorization}`,
          'Content-Type': 'application/json'
      	},
        body:JSON.stringify({
            deliveryid: myUUID,
            client: user,
            destination: {lat:myNewAddress.latitude,lng:myNewAddress.longitude},
            restaurant: args.items.restaurant,
            reference: myHash,
            owner: restaurantData.owner.id,
            items: tempArray,
            restaurantLocation: {lat:restaurantData.restaurant.latitude,lng:restaurantData.restaurant.longitude},
            restaurantName: restaurantData.restaurant.name
          })
        }).then((responseData)=>responseData.json).then((finalResult)=>{
          console.log(finalResult)
        }) 
        console.log(`user: ${user}`)
      

       //console.log(`Items ${JSON.stringify(tempArray)}`) 
      let response = {};
      const dataToUse = args.items.items;
      //We start to save our delivery in our database
      session = driver.session();
      const setData = session.run(`
        unwind $items as items
        match (i:item) where i.id = items.id
        with sum(i.price * items.amount) as price
        create (d:delivery{id:$delivery,state:0,total:(price+2.90),date:$date,type:$type,reference:$reference})
        with d
        match (p:person) where p.id = $id
        with d,p
        create (p)-[:MADE]->(d)-[:IS_FROM]->(p)
        with d,p
        match (res:restaurant) where res.id = $restaurant
        with d,p,res 
        create (d)-[:IS_DEVLIVER_BY]->(res)
        with d,p,res
        create (res)-[:DELIVERS]->(d)
        with d,p,res
        match (a:address) where a.id = $address
        with d,p,res,a
        create (d)-[:TO]->(a)
        with d,p,res,a 
        unwind $items as items 
        merge (d)-[:HAS]->(di:deliveryItem{id:items.id,item:items.item,amount:items.amount})
        with d,p,items,res,a,di

        unwind items.restrictions as itemsRestrictions
        match (restriction:restriction) where restriction.id = itemsRestrictions.restrictionId
        with d,p,items,res,a,di, itemsRestrictions,restriction

        merge (di)-[:HAS]->(r:restricionDeliveryItemData{id:randomUUID(), restriction:restriction.id})
        with d,p,items,res,a,di, itemsRestrictions,r,restriction

        unwind itemsRestrictions.restrictionValue as values
        match(restrictionValue:restrictionValue) where restrictionValue.id = values
        with d,p,items,res,a,di, itemsRestrictions,r,restriction,values,restrictionValue

        merge (r)-[:HAS]->(rv:restrictionDeliveryItemDataRestrictions{id:restrictionValue.id,value:restrictionValue.value}) 
        with d,p,items,res,a,di, itemsRestrictions,r,restriction,values,restrictionValue

        return d,p,di,r,res,a
      
        `,
        {
          id:user,
          delivery: myUUID,
          restaurant: args.items.restaurant,
          address: args.items.address,
          items: tempArray,
          date: new Date().toISOString(),
	        type: args.items.type,
          reference: myHash
        }
      ).then(async (result) => {
        session.close();
        console.log(`data: ${JSON.stringify(result)}`)
        response = {
            ... result.records[0]._fields[0].properties,
          user: {
            ... result.records[0]._fields[1].properties
          },
          address:{
            ... result.records[0]._fields[5].properties
          },
          restaurant:{
            ... result.records[0]._fields[4].properties
          }
        }
        console.log(result.records[0]._fields[0])
        
      }).catch((error) => {
        console.log(`error in add delivery ${error}`);
      })
      if(parseInt(args.type) === 1){
	   	
      }
      return {id: myUUID};
    }
  }
}

module.exports = {
  typeDefs,
  resolvers
}

const { driver } = require('../../conf/connection.js');

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
      //We declare an temp array to iterate the repeated values on our get
      let tempArray = [];
      //We will use a validator in the loop for knowing where the value repeats
      let validator = null;
      if(parseInt(args.type) === 1){
	      const sessionCard = driver.session();
	      const userCard = await sessionCard.run(`match (c:card) where c.id = $id`,{
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
          tempValue.restrictions.restrictionValue = getRealData(tempValue.restrictions.restrictionValue) ; 
          if(validator !== null){
            
            tempArray[validator.idChild].amount += 1;
            
            validator = null;
          }else{
            tempArray.push({...tempValue});
          }

      });
     
      const session = driver.session();
      let response = {};
      const dataToUse = args.items.items;      
      const setData = await session.run(`
        unwind $items as items
        match (i:item) where i.id = items.id
        with sum(i.price * items.amount) as price
        create (d:delivery{id:randomUUID(),state:0,total:price,date:$date,type:$type})
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
        merge (di)-[:Has]->(r:restricionDeliveryItemData{restrictionValue:itemsRestrictions.restrictionValue})
        return d,p,di,r,res,a
      
        `,
        {
          id:args.items.user,
          restaurant: args.items.restaurant,
          address: args.items.address,
          items: tempArray,
          date: new Date().toISOString(),
	        type: args.type
        }
      ).then(async (result) => {
        session.close();
        response = {
          ... result.records[0]._fields[0].properties,
          user: {
            ... result.records[0]._fields[1].properties
          }
        }
        console.log(result.records[0]._fields[0])
        
      }).catch((error) => {
        console.log(`error in add delivery ${error}`);
      })
      if(parseInt(args.type) === 1){
	   	
      }
      return response;
    }
  }
}

module.exports = {
  typeDefs,
  resolvers
}

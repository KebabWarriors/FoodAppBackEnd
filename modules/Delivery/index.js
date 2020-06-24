const { driver } = require('../../conf/connection.js');

const typeDefs = `
  
  type Delivery{
    id: ID 
    user: Person
    state: Int
    information: String
  }

  input DeliveryItemDataRestrictions{
    restrictionId: ID
    restrictionType: Int
    restrictionValue: [EscalarBooleanOrStringOrInt]
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
  }


  extend type Query{
    delivery(id: ID): Delivery
  }

  extend type Mutation{
    addDelivery(items: DeliveryItem): Delivery
  }

`;
const resolvers = {
  Query: {

  },
  Delivery:{
    addDelivery: async (parent, args,context,info) => {
      console.log("addDelivery");
      console.log(args.items.user)
      console.log(args.items.items)
      const session = driver.session();
      let response = {};
      const dataToUse = args.items.items;      
      const setData = await session.run(`
         
        create (d:delivery{id:randomUUID(),state:0})
        with d
        match (p:person) where p.id = $id
        with d,p
        create (p)-[:MADE]->(d)<-[:IS_FROM]-(p)
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
        merge (di)-[:Has]->(r:restricionDeliveryItemData{restrictionId:itemsRestrictions.restrictionId,restrictionType:itemsRestrictions.restrictionType,restrictionValue:itemsRestrictions.restrictionValue})
        return d,p,di,r,res,a
      
        `,
        {
          id:args.items.user,
          restaurant: args.items.restaurant,
          address: args.items.address,
          items: args.items.items

        }
      ).then((result) => {
        console.log(result.records)
      }).catch((error) => {
        console.log(`error in add delivery ${error}`);
      })
      return {
        id: "144494",
        user: {
          id: "asdasd",
          name: "asdasd",
          email: "asdasd"
        },
        state: 0,
        information: "Solo prueba"
      };
    }
  }
}

module.exports = {
  typeDefs,
  resolvers
}
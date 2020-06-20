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
    id: ID
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
    addDelivery: (parent, args,context,info) => {
      console.log("addDelivery");
      console.log(args.items.items)
      const session = driver.session();
      let response = {};
      const dataToUse = args.items.items;      
      /*const setData = await session.run(`
         
        create (d:delivery(id:randomUUID(),state:0))
        with d
        match (p:person) where u.id = $id
        with d,p
        create (p)-[:MADE]->(d)
        with d,p
        unwind $items as items 
        merge (d)-[:HAS]->(di:deliveryItem(id:items.id,item:items.item,amount:items.amount))
        with d,p,items,di
        unwind items.restrictions as itemsRestrictions
        merge (di)-[]->(r:restricionDeliveryItemData(restrictionId:itemsRestrictions.restrictionId,restrictionType:itemsRestrictions.restrictionType,restrictionValue:itemsRestrictions.restrictionValue))
        return d,p,di,r
      
        `,
        {

        }
      ).then((result) => {

      }).catch((error) => {
        console.log(`error in add delivery ${error}`);
      })*/
    }
  }
}

module.exports = {
  typeDefs,
  resolvers
}
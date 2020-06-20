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
      console.log(args.items)
      console.log(info)
      /*console.log(`add delivery`);
      console.log({...args});
      const session = driver.session();
      let response = {};
      const setData = await session.run(`
          
        `,
        {}
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
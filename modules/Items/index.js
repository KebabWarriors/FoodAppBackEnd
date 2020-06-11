const { driver } = require('../../conf/connection.js');

const typeDefs = `
  type Item{
    id: ID
    name: String
    description: String
    type: ItemType
    price: Float
    restaurant: Restaurant
    restrictions: [Restriction]  
  }

  type ItemType{
    id: ID
    name: String
  }

  type RestrictionType{
    id: ID
    name: String
  }

  type Restriction{
    id: ID
    type: RestrictionType
  }

  type RestrictionValue{
    id: ID
    value: String
    restiction: Restriction
  }

  input StorageRestrictions{
    iden: ID
    value: String
    values: [String]
  }

  extend type Query{
    item(id:ID): Item
    itemsByRestaurant(resturant: ID): [Item]
  }

  extend type Mutation{
    addItem(name: String, description: String, type: ID,price: Float,restaurant: ID,restricion: [StorageRestrictions]): Item
    addItemType(name: String): ItemType
    addRestrictionType(name: String): RestrictionType
    addRestiction(type: ID): Restriction
  }

`;

const resolvers = {
  Query: {

  },
  Items:{
    addRestrictionType: async (parent, args) => {
      const session = driver.session();
      let response = {};
      const getData = await session.run(
          'CREATE (r:restrictionType {id: randomUUID(),name: $name})return r',
          {name: args.name}
        ).then((result)=>{
          response = {...result.records[0]._fields[0].properties};
        });
     return response;   
    },
    addItemType: async (parent, args) =>{
      const session = driver.session();
      let response = {};
      const getData = await session.run(
          'CREATE (i:itemType {id:randomUUID,name:$name}return i)',
          {name: args.name}
        ).then(async (result) =>{
          response = {...result.records[0]._fields[0].properties};
        });
        return response;
    },
    addItem: async (parent, args) => {
      const session = driver.session();
      let response = {};
      let template = ``;

      const setData = await session.run(
        `
          CREATE (i:item {id: randomUUID(),name: $name, description: $description, price:$price})
          with i
          match (t:itemType) where t.id =  $itemType
          with i,t
          match (r:restaurant) where r.id = $restaurant
          with i,t,r
          merge (i)-[:IS_TYPE]->(t)
          merge (r)-[:HAS]->(i)
          with i,t,r
          unwind $option as rs
          merge (i)-[:IS_TYPE]->(b:restriction{id: randomUUID(),name:rs.value})
          with i,t,r,rs,b 
          match (d:restrictionType) where d.id = rs.iden
          with i,t,r,rs,d,b
          merge (b)-[:IS_TYPE]->(d)
          with i,t,r,rs,d,b
          unwind rs.values as campos
          merge (c:restrictionValue{id:randomUUID(),value:campos})-[:belongs]->(b)
          return i,t,r,rs,b,d,c
        `,
          {
            name: args.name,
            description: args.description,
            price: args.price,
            itemType: args.type,
            restaurant: args.restaurant,
            option: args.option
          }
        ).then((response)=>{
          //Item, ItemType, Restaurant, Options, Restriction, 
          //RestrictionType, ResctrictionValue
          console.log(response);
        });
        return response;
      }
    }
  }

module.exports = {
  typeDefs,
  resolvers
}
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

  extend type Query{
    item(id:ID): Item
    itemsByRestaurant(resturant: ID): [Item]
  }

  extend type Mutation{
    addItem(name: String, description: String, type: ID,price: Float,restaurant: ID,restricion: [RestrictionValue]): Item
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
        CREATE (i:item {id: randomUUID(),name: $name, description: $description, price:$price
        with i
        match (t:itemType) where t.id =  $type
        with i,t
        match (r:restaurant) where r.id = $restaurant
        with i,t,r
        merge (i)-[:IS_TYPE]->(t)
        merge (r)-[:HAS]->(i)
        unwid $restriction as rs 
        merge (a:item{id: i.id})-[:IS_TYPE]->(b:restricion{id: randomUUID})
        merge (b)-[:IS_TYPE]->(d:restrictionType{id:r.idType})
        merge (c:restrictionValue{id:randomUUID(),value:r.value})-[:belongs]->(b)
        return i,t,r,rs

        `,
          {}
        )
      }
    }
  }

module.exports = {
  typeDefs,
  resolvers
}
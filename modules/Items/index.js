const { driver } = require('../../conf/connection.js');

const typeDefs = `
  type Item{
    id: ID
    name: String
    description: String
    type: ItemType
    price: Float
    restaurant: Restaurant 
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

`;

const resolvers = {
  Query: {

  },
  Items:{

  }
}

module.exports = {
  typeDefs,
  resolvers
}
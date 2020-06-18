const { driver } = require('../../conf/connection.js');

const typeDefs = `

  type Delivery{
    id: ID 
    user: Person
    state: Int
    information: String
  }

  query DeliveryInput{
    item: ID
    name: String
    information: [RestrictionValueByItem ]
  }

  input InputDelivery{
    deliveries: [DeliveryInput]
  }  

  extend type Query{
   
  }

  extend type Mutation{
    addDelivery(items: [InputDelivery]): Delivery
  }

`;
const resolvers = {
  Query: {

  },
  Delivery:{
    addDelivery: (parent, args) => {

    }
  }
}

module.exports = {
  typeDefs,
  resolvers
}
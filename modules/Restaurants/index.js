const { driver } = require('../../conf/connection.js');

const typeDefs = `
	type RestaurantType{
		id: ID
		name: String
	}

	type Restaurant{
		id: ID
		name: String
		photo: String
		generalPrice: Float
		type: [RestaurantType],
    owner: Person,
    address: String
	}

	extend type Query{
		restaurant(id: ID): Restaurant
		restaurants: [Restaurant]
		restaurantsType: [RestaurantType]
	}

	extend type Mutation{
		addRestaurantType(name: String): RestaurantType,
    addRestaurant(name: String, photo: String, type: [Int], owner: Int, address: String)
	}
`;


const resolvers = {
	Query:{
		restaurantsType: async () => {
			const session = driver.session();
			let response = [];
			const getData = await session.run(
				'MATCH (r:restaurantsType) return r',
				{}
			).then(async (result) => {
				await session.close();
				result.records.forEach((value, key) => {
					response.push({id: value._fields[0].identity.low,...value._fields[0].properties})
				});
			});
			return response;
		}
	},
  Restaurant:{
    addRestaurantType: async (parent, args) => {
      const session = driver.session();
      let response = {};
      const getData = await session.run(
        'CREATE (r:restaurantsType { name: $name }) return r',
        {name: args.name}
      ).then(async (result) => {
        response = {id: result.records[0]._fields[0].identity.low,...result.records[0]._fields[0].properties}
      }).catch((error) => {
        console.log(`error: ${error}`);
      });
      return response;
    },
    addRestaurant: async (parent, args) =>{
      const session = driver.session();
      let response {};
    }
  }
}

module.exports = {
	typeDefs,
	resolvers
}
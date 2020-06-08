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
    addRestaurant(name: String, photo: String, type: [ID], owner: ID, address: String): Restaurant
	}
`;

const makeRandomAlias = (length) => {
  let result = '';
  const characters  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for ( let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

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
					response.push({...value._fields[0].properties})
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
        'CREATE (r:restaurantsType { id:randomUUID(),name: $name }) return r',
        {name: args.name}
      ).then(async (result) => {
        response = {...result.records[0]._fields[0].properties}
      }).catch((error) => {
        console.log(`error: ${error}`);
      });
      return response;
    },
    addRestaurant: async (parent, args) =>{
      const session = driver.session();
      let response = {};
      let params = {};
      let alias = ``;
      let counter = 0;
      args.type.forEach((item) => {
        
        if(counter === 0){
          alias += `rt.id = "${item}" `; 
        }else{
          alias += ` or rt.id = "${item}" `; 
        }
        counter++;
      });

      const getData = await session.run(
        ` match (p:person) where p.id = $owner 
          with p as pe 
          match (rt:restaurantsType) where ${alias} 
          with collect(rt) as myList,pe 
          unwind  myList as x 
          merge (r:restaurant {id: randomUUID(), name: $name, photo: $photo,address: $address}) 
          merge (pe)-[:owns]->(r) 
          merge (r)-[:is_type]->(x) 
          merge (x)-[:is_in]->(r) 
          return r,x,pe`,
        {
          name: args.name, 
          photo: args.photo,
          address:args.address,
          owner:args.owner
        }
      ).then( async (result) => {
        await session.close();
        if(result.records.length > 0){
          response = {
            ... result.records[0]._fields[0].properties,
            owner: result.records[0]._fields[2].properties,
            type: []
          };
          result.records.forEach((value,item) =>{
            //console.log(value._fields[1].properties);
            response.type.push({...value._fields[1].properties});
          });
        }
        /*console.log(result.records[0]._fields);
        console.log(result.records[1]._fields);*/
      });
      return response;
    }
  }
}

module.exports = {
	typeDefs,
	resolvers
}
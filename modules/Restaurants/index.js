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
		type: [RestaurantType]
    owner: Person,
    address: String
    description: String
	}

	extend type Query{
		restaurant(id: ID): Restaurant
		restaurants: [Restaurant]
    restaurantsByType(id: ID): [Restaurant] 
		restaurantsType: [RestaurantType]
	}

	extend type Mutation{
		addRestaurantType(name: String): RestaurantType
    addRestaurant(name: String, photo: String, type: [ID], owner: ID, address: String,description: String): Restaurant
	}
`;

const resolvers = {
	Query:{
		restaurantsType: async (parent, args) => {
      console.log(`restaurantsType: ${args}`);
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
		},
    restaurantsByType: async (parent, args) => {

      console.log(`restaurants by type: ${args}`);
      const session = driver.session();
      let response = [];
      //will help you to know if an id is inside of the object 
      //and it is, it will give us the 
      let iteratorTool = null;
      const getData = await session.run(
          `
            match (r:restaurant)-[s:is_type]->(b),
            (p:person)-[:owns]->(r) where b.id = $id
            return r,s,b,p
          `,
          {id: args.id}
        ).then((result) => {
          result.records.forEach((value,item)=>{
            //we verify if we have the restaurant in our object
            response.filter((value2,item2) => {
              if(value2.id === value._fields[0].properties.id){
                //we storage it on an object
                iteratorTool = {idParent: item, idChild: item2};
              }
            });
          
            response.push(
                {
                  ... value._fields[0].properties,
                  owner:  value._fields[3].properties,
                  type:  [{...value._fields[2].properties}]
                }
              );
            //Then we add it to the correct object in the array and delete the duplicate
            if(iteratorTool !== null){
              response[iteratorTool.idChild].type.push({...result.records[iteratorTool.idParent]._fields[2].properties});
              response.splice(iteratorTool.idChild-1,1);
              iteratorTool = null;
            }
            
          });
          
        });
        return response;

    },
    restaurant: async (parent, args) => {
      const session = driver.session();
      console.log(`restaurant: ${args}`);
      let response = [];
      let iteratorTool = null;
      const getData = await session.run(
        `match (r:restaurant)-[s:is_type]->(b),
          (p:person)-[:owns]->(r) where r.id = $id
          return r,s,b,p`,
          {
            id: args.id
          }
      ).then((result) => {
        result.records.forEach((value,item)=>{
            //we verify if we have the restaurant in our object
            response.filter((value2,item2) => {
              if(value2.id === value._fields[0].properties.id){
                //we storage it on an object
                iteratorTool = {idParent: item, idChild: item2};
              }
            });
          
            response.push(
                {
                  ... value._fields[0].properties,
                  owner:  value._fields[3].properties,
                  type:  [{...value._fields[2].properties}]
                }
              );
            //Then we add it to the correct object in the array and delete the duplicate
            if(iteratorTool !== null){
              response[iteratorTool.idChild].type.push({...result.records[iteratorTool.idParent]._fields[2].properties});
              response.splice(iteratorTool.idChild-1,1);
              iteratorTool = null;
            }
        });
      });
      return response[0];
    }, 
    restaurants: async (parent, args) => {
      console.log(`restaurants: ${args}`);
      const session = driver.session();
      let response = [];
      //will help you to know if an id is inside of the object 
      //and it is, it will give us the 
      let iteratorTool = null;
      const getData = await session.run(
          `
            match (r:restaurant)-[s:is_type]->(b),
            (p:person)-[:owns]->(r) 
            return r,s,b,p
          `,
          {}
        ).then((result) => {
          result.records.forEach((value,item)=>{
            //we verify if we have the restaurant in our object
            response.filter((value2,item2) => {
              if(value2.id === value._fields[0].properties.id){
                //we storage it on an object
                iteratorTool = {idParent: item, idChild: item2};
              }
            });
          
            response.push(
                {
                  ... value._fields[0].properties,
                  owner:  value._fields[3].properties,
                  type:  [{...value._fields[2].properties}]
                }
              );
            //Then we add it to the correct object in the array and delete the duplicate
            if(iteratorTool !== null){
              response[iteratorTool.idChild].type.push({...result.records[iteratorTool.idParent]._fields[2].properties});
              response.splice(iteratorTool.idChild-1,1);
              iteratorTool = null;
            }
            
          });
          
        });
        return response;
    }
	},
  Restaurant:{
    addRestaurantType: async (parent, args) => {
      console.log(`addRestaurant: ${args}`);
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
      console.log(`addRestaurant: ${args}`);
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
          create (r:restaurant {id: randomUUID(), name: $name, photo: $photo,address: $address,description:$description}) 
          with pe,r
          match (rt:restaurantsType) where ${alias} 
          with collect(rt) as myList,pe,r
          unwind  myList as x 
          merge (pe)-[:owns]->(r) 
          merge (r)-[:is_type]->(x) 
          merge (x)-[:is_in]->(r) 
          return r,x,pe`,
        {
          name: args.name, 
          photo: args.photo,
          address:args.address,
          owner:args.owner,
          description: args.description
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
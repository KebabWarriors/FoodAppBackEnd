const { driver } = require('../../conf/connection.js');
const { addToStorage } = require('../../helpers/upload');
const fetch = require('cross-fetch');

const typeDefs = `
	

  type RestaurantType{
    id: ID
    name: String
    image: String
  }

  type Restaurant{
    id: ID
    name: String
    image: String
    generalPrice: Float
    type: [RestaurantType]
    owner: Person,
    address: String
    description: String
    latitude: Float
    longitude: Float
  }

  extend type Query{
    restaurant(id: ID): Restaurant
    restaurantsByOwner(owner: String): [Restaurant]
    restaurantByOwner(owner: String,restaurant: String): Restaurant
    restaurants: [Restaurant]
    restaurantsWithoutType: [Restaurant]
    restaurantsByType(id: ID): [Restaurant] 
    restaurantsType: [RestaurantType]
    getBucket: Boolean
  }

  extend type Mutation{
    addRestaurantType(name: String): RestaurantType
    addRestaurantWithOwner(name: String, owner: String): Restaurant
    editRestaurant(restaurant:String,name: String, image: String, type: [String], owner: ID, address: String,description: String,latitude: Float,longitude: Float): Restaurant
    uploadRestaurantPhoto(file: Upload): String
    deleteRestaurant(id: String): Boolean
  }
`;

const resolvers = {
  Query:{
    getBucket: async (parent, args) =>{
       addToStorage();
    },
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
    restaurantByOwner: async (parent,args)=>{
	    const session = driver.session();
      console.log(`restaurant: ${args}`);
      let response = {};
      let iteratorTool = null;
      const getData = await session.run(
        `match (r:restaurant),
          (p:person)-[]->(r) where p.id = $owner and r.id = $restaurant
          return r,p`,
          {
        	  owner: args.owner,
            restaurant: args.restaurant
          }
      ).then((result) => {
	      console.log(JSON.stringify(result.records[1]))
	      if(result.records.length > 0){
		        response = {...result.records[0]._fields[0].properties, owner: result.records[0]._fields[1].properties};
	      }
      })
	    return response;
    },
    restaurant: async (parent, args) => {
      const session = driver.session();
      console.log(`restaurant: ${args}`);
      let response = [];
      let iteratorTool = null;
      const getData = await session.run(
        `match (r:restaurant),
          (p:person)-[]->(r) where r.id = $id
          return r,p`,
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
                  owner:  value._fields[1].properties,
                  //type:  [{...value._fields[2].properties}]
                }
              );
            //Then we add it to the correct object in the array and delete the duplicate
            if(iteratorTool !== null){
              response[iteratorTool.idChild].type.push({...result.records[iteratorTool.idParent]._fields[1].properties});
              response.splice(iteratorTool.idChild-1,1);
              iteratorTool = null;
            }
        });
      });
      return response;
    }, 
    restaurantsByOwner: async (parent,args) =>{
      const session = driver.session();
      console.log(`restaurant: ${args}`);
      let response = [];
      let iteratorTool = null;
      const getData = await session.run(
        `match (r:restaurant),
          (p:person)-[]->(r) where p.id = $id
          return r,p`,
          {
            id: args.owner
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
                  owner:  value._fields[1].properties,
                  //type:  [{...value._fields[2].properties}]
                }
              );
            //Then we add it to the correct object in the array and delete the duplicate
            if(iteratorTool !== null){
              response[iteratorTool.idChild].type.push({...result.records[iteratorTool.idParent]._fields[1].properties});
              response.splice(iteratorTool.idChild-1,1);
              iteratorTool = null;
            }
        });
      });
      return response;

    },
    restaurantsWithoutType: async (parent, args) => {
      console.log(`restaurants whitouttype: ${args}`);
      const session = driver.session();
      let response = [];
      //will help you to know if an id is inside of the object 
      //and it is, it will give us the 
      let iteratorTool = null;
      const getData = await session.run(
          `
            match (r:restaurant),
            (p:person)-[:owns]->(r) 
            return r,p
          `,
          {}
        ).then((result) => {
          result.records.forEach((value,item)=>{
            //we verify if we have the restaurant in our object
             response.push(
                {
                  ... value._fields[0].properties,
                  owner:  value._fields[1].properties,
                }
              );
            
            
          });
          
        });
        return response;
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
          
                        //Then we add it to the correct object in the array and delete the duplicate
            if(iteratorTool !== null){
              response[iteratorTool.idChild].type.push({...result.records[iteratorTool.idParent]._fields[2].properties});
              //response.splice(iteratorTool.idChild-1,1);
              iteratorTool = null;
            }else{
             response.push(
                {
                  ... value._fields[0].properties,
                  owner:  value._fields[3].properties,
                  type:  [{...value._fields[2].properties}]
                }
              );
 
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
    addRestaurantWithOwner: async (parent,args) =>{
	    console.log(`Add restaurant with owner`);
	    let newOwner;
	    let response = {};
	    const session = driver.session();
	    //Firts we verify if we have the user in our internal database
	    const verifyUserOnStore = await session.run(`
	      match (p:person) where p.email = $email return p
	    `,
	    {
	      email: args.owner
	    }).then(async (result)=>{
	      await session.close();
	      const session2 = driver.session();
	      if(result.records.length === 0){
	        //Send data to lambda to sign up in cognito
          const tempSession = driver.session();
          const newUID = await tempSession.run(`return randomUUID()`,{}).then(async (result)=>{
            await tempSession.close();
            newOwner = result.records[0]._fields[0];
            console.log(newOwner)
            return result.records[0]._fields[0];
          }); 
	        const newUser = await fetch(`${process.env.CREATE_RESTAURANT_OWNER_URL}`,{
	            method: 'POST',
               headers:{
                'Content-Type': 'application/json'
      	      },
              body: JSON.stringify({email: args.owner,uid: newUID})
            }).then((response) => response.json()).then((result)=>{
      	    }).catch(error => console.log(`ERROR ${error}`));  	 	 	
	   
	        //Starting our internal data	
	        const setData = await session2.run(`
	          create (r:restaurant{id: randomUUID(),name: $name})
	          with r
	          create (p:person{id:$id,email:$email,verified:false})
	          with r,p
	          merge (p)-[:owns]->(r) 
	          return r
	        `,{
		          name: args.name,
		          id: newOwner,
		          email: args.owner
	          }).then((newResult)=>{
	            response = newResult.records[0]._fields[0].properties;
	          }).catch(error => console.log(`ERROR AT DATABASE ${error}`));
	    }else{

	      newOwner = result.records[0]._fields[0].properties.id;
	      //Starting our internal data	
	   const setData = await session2.run(`
	      create (r:restaurant{id: randomUUID(),name: $name})
	      with r
	      match (p:person) where p.id = $id
	      with r,p
	      merge (p)-[:owns]->(r) 
	      return r
	    `,{
		        name: args.name,
		        id: newOwner
	        }).then(async (newResult)=>{
	          await session.close()
	          response = newResult.records[0]._fields[0].properties;
	        }).catch(error => console.log(`ERROR AT DATABASE ${error}`));
	      }
  	  }); 
	    return response;	
    },
    editRestaurant: async (parent, args) =>{
      console.log(`editRestaurant: ${JSON.stringify(args)}`);
      //const image = await addToStorage(args.file);
      //console.log(`image: ${JSON.stringify(args.file)}`);
      const session = driver.session();
      let response = {};
      let params = {};
      let alias = ``;
      let counter = 0;
	/*
	 *  ForEach type we send, we assign an alias for them to save on the restaurant
	 * */
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
          match (r:restaurant) where r.id = $id set r.name = $name, r.image = $photo,r.address = $address,r.description = $description, r.latitude = $latitud, r.longitude = $longitud 
          with pe,r
          match (rt:restaurantsType) where ${alias} 
          with collect(rt) as myList,pe,r
          unwind  myList as x 
          merge (pe)-[:owns]->(r) 
          merge (r)-[:is_type]->(x) 
          merge (x)-[:is_in]->(r) 
          return r,x,pe`,
        {
          id: args.restaurant,
          name: args.name, 
          photo: args.image,
          address:args.address,
          owner:args.owner,
          description: args.description,
          latitud: args.latitude,
          longitud: args.longitude
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
    },
    deleteRestaurant: async (parent,args) =>{
      console.log(`delete restaurant`);
      console.log(args.id)
      const session = driver.session();
      let response = false;
      const deleteRestaurant = await session.run(`match (r:restaurant) where r.id = $id detach delete r `,{
        id: args.id
      }).then(async (result)=>{
        await session.close();
          response = true;
      });
    return response;
  },
    uploadRestaurantPhoto: async (parent, args)=>{
     try{
      args.file.then(file =>{
        console.log(file)
      });
      const { stream, filename, mimetype, encoding } = await file;

      // 1. Validate file metadata.

      // 2. Stream file contents into cloud storage:
      // https://nodejs.org/api/stream.html

      // 3. Record the file upload in your DB.
      // const id = await recordFile( … )

      console.log(JSON.stringify( { filename, mimetype, encoding }));
      return "yes";
     }catch(error){
        console.log(`Error ${error}`)
        console.log(JSON.stringify(args.type))
     }
    }
  }
}

module.exports = {
	typeDefs,
	resolvers
}

const { driver } = require('../../conf/connection.js');

const typeDefs = `
  
  type Item{
    id: ID
    name: String
    description: String
    type: ItemType
    price: Float
    image: String
    restaurant: Restaurant
    restrictions: [Restriction]  
  }

  type ItemType{
    id: ID
    name: String
  }

  type RestrictionType{
    id: ID
    name: Int
  }

  type Restriction{
    id: String
    name: String
    required: Boolean
    type: RestrictionType
    quantity: Int
  }

  type RestrictionValue{
    id: String
    value: String
    price: Float
    restriction: Restriction
  }

  type ItemByType{
    id: ID
    name: String
    items: [Item]
  }

  type RestrictionValueByItemData{
    id: String
    value:  ScalarBooleanOrStringOrInt
    price: Float
  }

  type RestrictionValueByItem{
    id: ID
    name: String
    type: RestrictionType
    required: Boolean    
    quantity: Int
    values: [RestrictionValueByItemData]
  }

  #Equivalent of Item when returning Resctricions of Item
  type RestrictionByItem{
    id: ID
    name: String
    description: String
    price: Float
    restriction: [RestrictionValueByItem]
  }


  input ValueByItemData{
    value: ScalarBooleanOrStringOrInt
    price: Float
  }

  input StorageRestrictions{
    idRestrictionType: ID
    nameRestriction: String
    required: Boolean
    quantity: Int
    price: Float
    values: [ValueByItemData]
  }

  extend type Query{
    item(id:ID): Item
    itemsByRestaurant(id: ID): [Item]
    itemsByRestaurantByType(id: ID): [ItemByType]
    restrictionsByItem(id: ID): RestrictionByItem
    restrictionTypes: [RestrictionType]
    itemTypes: [ItemType]
  }

  extend type Mutation{
    addItem(name: String, description: String, type: ID,price: Float,restaurant: ID,image: String,restriction: [StorageRestrictions]): Item
    addItemType(name: String): ItemType
    addRestrictionType(name: String): RestrictionType
    addRestiction(type: ID): Restriction
    editItem(id: String, name: String, description: String, type: String,price: Float,image: String): Item
    deleteItem(id: String): Boolean
  }

`;

const resolvers = {
  Query: {
    itemsByRestaurant: async (parent,args) => {
      console.log(`itemsByRestaurant: ${args}`);
      const session = driver.session();
      let response = [];
      let iteratorTool = null;
      const getData = await session.run(
        ` match (r:restaurant)-[]->(i:item) where r.id = $id
          with r,i
          match (i)-[]->(it:itemType)
          return r,i,it
          `
        ,{
          id: args.id
        }).then(async (result) =>{
          await session.close();
	      if(result.records.length > 0){
          result.records.forEach((value,item)=>{
            //we verify if we have the restaurant in our object
            response.push(
              {
                ... value._fields[1].properties,
                resturant:  value._fields[0].properties,
                type:  value._fields[2].properties
              }
            );
          });
	}
        });
        return response;
    },
    itemTypes: async (parent, args) =>{
	    console.log(`Items Type`);
	    const session = driver.session();
	    let response = [];
	    const getData = await session.run(`
	      match (i:itemType) return i
	    `,{}).then(async (result)=>{
	        result.records.forEach((value,item)=>{
		      response.push(value._fields[0].properties);
	      });
	    }).catch(error => console.log(`ERROR ${ERROR}`));
	    return response;
    },
    restrictionTypes: async (parent,args) =>{
	    console.log(`Restrictions Types`);
	    const session = driver.session();
	    let response = [];
	    const getData = await session.run(`
	      match (r:restrictionType) return r
	    `,
	    {}).then(async (result)=>{
	      await session.close();
	      result.records.forEach((value,item)=>{
	      response.push(value._fields[0].properties);
	    });
	}).catch(error => console.log(`Error ${error}`));
	return response;
    },
    itemsByRestaurantByType: async (parent, args) => {
      console.log(`itemsByRestaurantByType: ${args.id}`);
      const session = driver.session();
      let response = [];
      let iteratorTool = null;
      const getData = await session.run(
        ` match (r:restaurant)-[]->(i:item) where r.id = $id
          with r,i
          match (i)-[]->(it:itemType)
          return r,i,it
          `
        ,{
          id: args.id
        }).then(async (result) =>{
          await session.close();
          result.records.forEach((value,item)=>{
            //we verify if we have the restaurant in our object
            response.filter((value2,item2) => {
              if(value2.id === value._fields[2].properties.id){
                //we storage it on an object
                console.log({idParent: item, idChild: item2})
                //Id parent means the new element that will be added
                //the child element means the element that is already
                //in the object/
                iteratorTool = {idParent: item, idChild: item2};
              }
            });
          
            if(iteratorTool !== null){
              response[iteratorTool.idChild].items.push(
                {
                    ...value._fields[1].properties,
                      type:value._fields[2].properties,
                      restaurant: value._fields[0].properties
                });
              response.splice(iteratorTool.idChild+1,1);
              iteratorTool = null;
            }else{
              //Then we add it to the correct object in the array and delete the duplicate
              response.push(
                {
                  ... value._fields[2].properties,
                  items:  [
                    {
                      ...value._fields[1].properties,
                      type:value._fields[2].properties,
                      restaurant: value._fields[0].properties
                    }
                  ],
                }
              );

            }
            
          });
        });
        return response;
    },
    restrictionsByItem: async (parent, args) => {
      console.log(`ResctrictionByItem: ${args}`);
      const session = driver.session();
      let response = [];
      let iteratorTool = null
      const getData = await session.run(
        ` 
          match (i:item)-[]->(r:restriction) where i.id = $id
          with i,r
          match (r)-[]->(rt:restrictionType)
          with i,r,rt
          match (r)<-[]-(rv:restrictionValue)
          return i,r,rt,rv
        `,
        {
          id: args.id
        }
      ).then( async (result)=>{
        await session.close();
        response = {
          ...result.records[0]._fields[0].properties ,
          restriction: []
        };
        result.records.forEach((value,item)=>{
          //console.log(value._fields[2])
            //we verify if we have the restaurant in our object
            response.restriction.filter((value2,item2) => {
              if(value2.id === value._fields[1].properties.id){
                //we storage it on an object
                iteratorTool = {
                  idParent: item, 
                  idChild: item2
                };
              }
            });
            //console.log(value._fields[1].properties);
            response.restriction.push(
                {
                  ...value._fields[1].properties,
                  type:value._fields[2].properties,
                  values: [{...value._fields[3].properties}]
                }
              );
            //Then we add it to the correct object in the array and delete the duplicate
            if(iteratorTool !== null){
              response.restriction[iteratorTool.idChild].values.push(
                {
                  ...value._fields[3].properties
                });
              
              response.restriction.splice(iteratorTool.idChild+1,1);
              iteratorTool = null;
            }
          });
      });
      let newRestrictionsValues = [];
      let mayorValue = 0;
      response.restriction.forEach((value,item)=>{
	//console.log(`PROBANDO FOR EACH ${JSON.stringify(value)}`) 
	console.log(value.type.name)
	if(parseInt(value.type.name) === 3){
	  //console.log(JSON.stringify(value))
	  value.values.forEach((value2,item2)=>{
	     //console.log(`segundo for each ${JSON.stringify(value2.value)}`);
	     if(parseInt(value2.value) > mayorValue){
		mayorValue = parseInt(value2.value);
	     }  
	  });
	  for(let i=1; i<=mayorValue;i++){
	    console.log(`${value.id}-${i}`)

	    newRestrictionsValues.push({
		id: `${value.id}-${i}`,
		value: i.toString()
	    });
	  }
	  if(newRestrictionsValues.length > 0){	
 	    response.restriction[item].values = newRestrictionsValues;
	  }
	}
      });
      console.log(`HEY! ${JSON.stringify(response)}`);
      return response; 
    }
  },
  Items:{
    addRestrictionType: async (parent, args) => {
      const session = driver.session();
      let response = {};
      const getData = await session.run(
          'CREATE (r:restrictionType {id: randomUUID(),name: $name})return r',
          {name: parseInt(args.name)}
        ).then((result)=>{
          response = {...result.records[0]._fields[0].properties};
        });
     return response;   
    },
    addItemType: async (parent, args) =>{
      const session = driver.session();
      let response = {};
      const getData = await session.run(
          'CREATE (i:itemType {id:randomUUID(),name:$name})return i',
          {name: args.name}
        ).then(async (result) =>{
          response = {...result.records[0]._fields[0].properties};
        });
        return response;
    },
    addItem: async (parent, args) => {
      const session = driver.session();
      let response = {};

      const setData = await session.run(
        `
          CREATE (i:item {id: randomUUID(),name: $name, description: $description, price:$price,image:$image})
          with i
          match (t:itemType) where t.id =  $itemType
          with i,t
          match (r:restaurant) where r.id = $restaurant
          with i,t,r
          merge (i)-[:IS_TYPE]->(t)
          merge (r)-[:HAS]->(i)
          with i,t,r
          unwind $option as rs
          merge (i)-[:HAS]->(b:restriction{id: randomUUID(),name:rs.nameRestriction,required:rs.required,quantity:rs.quantity})
          with i,t,r,rs,b 
          match (d:restrictionType) where d.id = rs.idRestrictionType
          with i,t,r,rs,d,b
          merge (b)-[:IS_TYPE]->(d)
          with i,t,r,rs,d,b
          unwind rs.values as campos
          merge (c:restrictionValue{id:randomUUID(),value:campos.value})-[:belongs]->(b)
          return i,t,r,b,d
        `,
          {
            name: args.name,
            description: args.description,
            price: args.price,
            itemType: args.type,
            restaurant: args.restaurant,
            option: args.restriction,
            image: args.image
          }
        ).then(async (result)=>{
          //Item, ItemType, Restaurant, Options, Restriction, 
          //RestrictionType, ResctrictionValue
          /*response.records.forEach((value,item)=>{
            console.log(`respuesta ${item+1}`);
            console.log(value._fields);  
          });*/
        await session.close();
        response ={
            ... result.records[0]._fields[0].properties,
            resturant:  result.records[0]._fields[2].properties,
            type:  result.records[0]._fields[1].properties,
            restrictions: []
          };
        result.records.forEach((value,item)=>{
          response.restrictions.push({...value._fields[3].properties, type:value._fields[4].properties});
          
        });

      });
      console.log(`RESPUESTA ITEMS: ${JSON.stringify(response)}`)
        return response;
      },
      editItem: async(parent,args)=>{
        console.log(`EDITAR PLATILLO ${JSON.stringify(args)}`);
        const session = driver.session();
        let response = {};  
        const editItem = await session.run(`
            match (i:item) where i.id = $id set i.name = $name, i.description = $description, i.price=$price,i.image=$image
            with i
            match (i)-[s]->(it:itemType)
            with i,s
            delete s
            with i
            match (it:itemType) where it.id = $type
            with i,it
            create (i)-[:IS_TYPE]->(it)
            return i,it
          `,{
              id: args.id,
              name: args.name,
              description: args.description,
              price: args.price,
              image: args.image,
              type: args.type
          }).then(async(result)=>{
             await session.close();
              response = {...result.records[0]._fields[0].properties,type:result.records[0]._fields[1].properties}; 
          }).catch(error=>console.log(`ERROR AL EDITAR PLATILLO ${JSON.stringify(error)}`));
        return response;
      },
      deleteItem: async(parent,args)=>{
        const session = driver.session();
        let response = false;
        const deleteItem =  await session.run(`
          match (i:item)<-[j]-(r:restaurant),
                (i)-[k]->(it:itemType),
                (i)-[l]->(res:restriction),
                (res)-[m]->(rt:restrictionType),
                (res)<-[n]-(rv:restrictionValue)
          where i.id = $id 
          delete  j,k,l,m,n,i,res,rv
        `,{
          id: args.id
        }).then(async(result)=>{
            await session.close();  
            response = true;            
        });
        return response;
      }
    }
  }

module.exports = {
  typeDefs,
  resolvers
}

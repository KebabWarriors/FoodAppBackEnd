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
    id: ID,
    name: String
    type: RestrictionType
  }

  type RestrictionValue{
    id: ID
    value: String
    restriction: Restriction
  }

  type ItemByType{
    id: ID
    name: String
    items: [Item]
  }

  type RestrictionValueByItemData{
    id: ID
    value: String
  }

  type RestrictionValueByItem{
    id: ID
    name: String
    type: RestrictionType
    values: [RestrictionValueByItemData]
  }

  type RestrictionByItem{
    id: ID
    name: String
    description: String
    price: Float
    restriction: [RestrictionValueByItem]
  }


  input StorageRestrictions{
    idRestrictionType: ID
    nameResctriction: String
    valuesResctriction: [String]
  }

  extend type Query{
    item(id:ID): Item
    itemsByRestaurant(id: ID): [Item]
    itemsByRestaurantByType(id: ID): [ItemByType]
    restrictionsByItem(id: ID): [RestrictionByItem]
  }

  extend type Mutation{
    addItem(name: String, description: String, type: ID,price: Float,restaurant: ID,restriction: [StorageRestrictions]): Item
    addItemType(name: String): ItemType
    addRestrictionType(name: String): RestrictionType
    addRestiction(type: ID): Restriction
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
        });
        return response;
    },
    itemsByRestaurantByType: async (parent, args) => {
      console.log(`itemsByRestaurantByType: ${args}`);
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
                iteratorTool = {idParent: item, idChild: item2};
              }
            });
          
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
            //Then we add it to the correct object in the array and delete the duplicate
            if(iteratorTool !== null){
              response[iteratorTool.idChild].items.push(
                {
                  ...value._fields[1].properties,
                      type:value._fields[2].properties,
                      restaurant: value._fields[0].properties
                });

              }
              response.splice(iteratorTool.idChild-1,1);
              iteratorTool = null;
            
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
        result.records.forEach((value,item)=>{
            //we verify if we have the restaurant in our object
            response.filter((value2,item2) => {
              if(value2.id === value._fields[0].properties.id){
                //we storage it on an object
                iteratorTool = {
                  idParent: item, 
                  idChild: item2
                };
              }
            });
            console.log(value._fields[1].properties);
            response.push(
                {
                  ... value._fields[0].properties,
                  restriction:[{
                      ...value._fields[1].properties,
                      type:value._fields[2].properties,
                      values: [{...value._fields[3].properties}]
                    }]
                }
              );
            //Then we add it to the correct object in the array and delete the duplicate
            if(iteratorTool !== null){
              response[iteratorTool.idChild].restriction.push(
                {
                  ...value._fields[1].properties,
                      type:value._fields[2].properties,
                      values: [{...value._fields[3].properties}]
                });
              
              response.splice(iteratorTool.idChild-1,1);
              iteratorTool = null;
            }
          });
      });
      return response; 
    }
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
          merge (i)-[:IS_TYPE]->(b:restriction{id: randomUUID(),name:rs.nameResctriction})
          with i,t,r,rs,b 
          match (d:restrictionType) where d.id = rs.idRestrictionType
          with i,t,r,rs,d,b
          merge (b)-[:IS_TYPE]->(d)
          with i,t,r,rs,d,b
          unwind rs.valuesResctriction as campos
          merge (c:restrictionValue{id:randomUUID(),value:campos})-[:belongs]->(b)
          return i,t,r,b,d
        `,
          {
            name: args.name,
            description: args.description,
            price: args.price,
            itemType: args.type,
            restaurant: args.restaurant,
            option: args.restriction
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
        return response;
      }
    }
  }

module.exports = {
  typeDefs,
  resolvers
}
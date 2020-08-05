const dotenv = require("dotenv");
const fetch = require('cross-fetch');
dotenv.config();


const verifyToken = async (newToken) =>{
     const token = newToken.split(" ")[1];
      let userId = null;
      const userToken = await fetch(`${process.env.TOKEN_VERIFICATION_URL}`,{
	    method: 'POST',
        headers:{
          "token": token,
          'Content-Type': 'application/json'
      	},
        body:JSON.stringify({token:token})
      }).then((response) => response.json()).then((result)=>{
        userId = result;
      }).catch(error => console.log(`ERROR ${error}`));
      return userId;
}
module.exports = {
   verifyToken
}

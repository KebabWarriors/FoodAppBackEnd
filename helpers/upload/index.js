const { createWriteStream } = require("fs");
const { Storage } = require("@google-cloud/storage");
const path = require("path");



const gc = new Storage({
  keyFilename: path.join(__dirname, "../../restaurantweb.json"),
  projectId: "restaurantweb"
});

const imagesBuckect = gc.bucket('biitemages');

async function addToStorage(file){
  //gc.getBuckets().then(x => console.log(x));
  try{
    const { createReadStream, filename } = await file;

        await new Promise(res =>
          createReadStream()
            .pipe(
              coolFilesBucket.file(filename).createWriteStream({
                resumable: false,
                gzip: true
              })
            )
            .on("finish", res)
        );

        //files.push(filename);
    return filename;
  }catch(error){
    console.log(`ERROR TRYING TO UPLOAD FILE: ${JSON.stringify(error)}`)
    console.log(`File Recived: ${JSON.stringify(file)}`)
  }
}

module.exports = {
  addToStorage
}

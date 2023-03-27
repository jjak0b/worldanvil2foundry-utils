const fs = require('fs');
const path = require('path');

const { fetchPage } = require("./libs/utils");
const { parse } = require("./libs/worldanvil-parser");

async function main() {

// Get the directory of the script
const scriptDir = path.join(path.dirname(process.argv[1]), 'worldanvil');

// List of objects with path and link
const files = JSON.parse( fs.readFileSync( process.argv[2] || "./urls.json" ) );

Promise.all(
    files.map( file => fetchPage(file)
            .then( async htmlContent => parse( htmlContent, file ) )
            .then( async obj => new Promise( (resolve, reject) => {
                const json = JSON.stringify( obj, null, 4 );
                // console.log( json );

                const filePath = path.join(scriptDir, file.path);
                const dir = path.dirname(filePath);

                console.log( "parsed: ", file );

                fs.mkdir(dir, { recursive: true }, (err) => {
                    if( err && err.code != 'EEXIST' ) reject( err );
                    fs.writeFile(filePath, json,  'utf-8', (err) => {
                        if( err ) reject( err );
                        console.log( "wrote: ", file );
                        resolve();
                    });
                  });
            }))
            .catch( (err) => {
                console.error("Error:", err);
            })
            // .then( (value) => console.log( value ) )
            
    )
)
  .then(() => console.log('All files downloaded successfully'))
  .catch(error => console.error(`Error while downloading files: ${error}`));
}

main();
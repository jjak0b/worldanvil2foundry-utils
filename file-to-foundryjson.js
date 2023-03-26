const fs = require('fs');
const path = require('path');
const{ translate } = require('bing-translate-api');


var argv = require('yargs/yargs')(process.argv.slice(2)).argv;
/*
const fileContent = fs.readFileSync("./worldanvil/Nozioni generali/Luoghi del mondo/Doriath, la città sconsacrata.html", 'utf-8');
console.log( fileContent );
let parsedPage = JSON.parse( fileContent );
console.log( parsedPage );
return;
*/
const placesDirname  = argv.places ? path.resolve(argv.places) : null;
const personsDirname = argv.persons ? path.resolve(argv.persons) : null;

function readFiles(dir, filelist = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isDirectory()) {
      filelist = readFiles(filePath, filelist);
    } else {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const fileExtension = path.extname(file);
      const fileName = path.basename(file, fileExtension);
      const fileObject = {
        filename: fileName,
        path: path.relative(process.cwd(), path.dirname(filePath)).replaceAll('\\', '__'),
        content: fileContent,
      };
      filelist.push(fileObject);
    }
  });

  return filelist;
}


// translate keys to standard names for Monk journal
function engKey2Standard( key ) {

  // this function is like a switch case

  // cases are possibile values contained in translation
  // value is the mapped key word
  let handlers = [
      {
          cases: [ "species", "races", "race" ],
          value: "race"
      },
      {
          cases: ["gender", "biological sex", "Sex", "genre"],
          value: "gender"
      },
      {
          cases: ["eyes"],
          value: "eyes"
      },
      {
          cases: ["hair", "hairstyle"],
          value: "hair"
      },
      {
          cases: ["skin", "complexion"],
          value: "skin"
      },
      {
          cases: ["tall", "height", "stature"],
          value: "height"
      },
      {
          cases: ["weight"],
          value: "height"
      },
      {
          cases: ["population", "inhabitants", "population count"],
          value: "inhabitants"
      }
  ];
  
  let stdKey = handlers.map( (handleCase, index) => {
      if( handleCase.cases.some( keyCase => key.includes(keyCase) ) ) {
          return handleCase.value;
      }
      else {
          return null;
      }
  }).find( str => str != null );

  return stdKey ? stdKey : null;

}

async function panels2Attributes(panels) {
  let attributes = {};
  if( panels && panels.length ) {
    // process panels to translate some commond keywords
    for( let items of panels){
      let entriesList = items.map(item => Object.entries( item )[0] );

      // translate first level keys to standard names (nested ones not needed)
      let keys = entriesList.map(item => item[0] );
      
      if( keys.length ){
          try {
              let { translation, correct, correctedText }= await translate(keys.join(" ## "), null, 'en' );
              translated = correct && correctedText && correctedText.length > 0 ? correctedText : translation;
              keys = translated.split(" ## ").map( s => s.toLowerCase() );
          } catch (e) {
              // we can hit limit usage
              if (e.name === 'TooManyRequestsError') {
                  console.error( "TooManyRequestsError" );
              }
              console.error( "Error while translating keys, reason:", e );
              throw e;
          }
      }

      // create a new panel with all keys standardized
      for( let j = 0; j < entriesList.length; j++ ) {
        let entryValue = entriesList[j][1];

        if( keys[j] == 'info')
          continue;
        
        let attrValue = "";
        if( entryValue ) {
          if( entryValue.text ){
            attrValue = entryValue.text;
          }
          else if( entryValue.list ){
            attrValue = entryValue.list
              .map( item => item.text || null )
              .filter( str => str != null )
              .join(', ');
          }
        }
        attributes[ engKey2Standard(keys[j]) || keys[ j ] ] = { "value": attrValue, "hidden": false };
      }
    }
  }

  return attributes;
}

const fileDirectory = './worldanvil'; // example C:/Users/utonto/Desktop/test_worldanvil/worldanvil
const fileList = readFiles(fileDirectory);

// console.log(fileList);

const baseFolderId = 'IMPORTDIOOFOLD00';
const baseFolderName = 'worldanvil';
const folders = [];
const baseFolder = '{"name":"worldanvil","sorting":"a","folder":null,"type":"JournalEntry","description":"","sort":0,"color":null,"flags":{},"_stats":{"systemId":null,"systemVersion":null,"coreVersion":null,"createdTime":null,"modifiedTime":null,"lastModifiedBy":null},"_id":"IMPORTDIOOFOLD00"}';
const templateFolderJson = '{"name":"{{FOLDER_NAME}}","sorting":"a","folder":"{{PARENT_FOLDER_ID}}","type":"JournalEntry","description":"","sort":0,"color":null,"flags":{},"_stats":{"systemId":null,"systemVersion":null,"coreVersion":null,"createdTime":null,"modifiedTime":null,"lastModifiedBy":null},"_id":"{{FOLDER_ID}}"}';
// {{FOLDER_NAME}}
// {{PARENT_FOLDER_ID}}
// {{FOLDER_ID}} = PegclO3qLePm52iX

const templateJournalJson = '{"name":"{{ENTRY_NAME}}","flags":{"monks-enhanced-journal":{"pagetype":"text"}},"pages":[{"type":"text","name":"{{PAGE_NAME}}","_id":"{{PAGE_ID}}","title":{"show":true,"level":1},"image":{},"text":{"format":1,"content":"{{PAGE_CONTENT}}","markdown":""},"video":{"controls":true,"volume":0.5},"src":null,"system":{},"sort":0,"ownership":{"default":-1},"flags":{"monks-enhanced-journal":{"appendix":false}}}],"folder":"{{FOLDER_ID}}","sort":0,"ownership":{"default":0,"KOJVAHHAzP2BhIJB":3},"_stats":{"systemId":"dnd5e","systemVersion":"2.1.5","coreVersion":"10.291","createdTime":1679607503965,"modifiedTime":1679609827281,"lastModifiedBy":"KOJVAHHAzP2BhIJB"},"_id":"{{ENTRY_ID}}"}';
// {{ENTRY_NAME}}
// {{PAGE_NAME}}
// {{PAGE_CONTENT}}

// {{PAGE_ID}} = qtRtTmwl5SA6bca3
// {{FOLDER_ID}} = PegclO3qLePm52iX
// {{ENTRY_ID}} = BSd1X49uIXqQMM83

async function main() {

  for( let index = 0; index < fileList.length; index++) {
    let file = fileList[ index ];

    const paths = file.path.split('__');
    // first folder
    const folderName = paths[1];
    const folder = folders.find( i => i.name == folderName );
    const folderId = !!folder ? folder.folderId : 'IMPORTDIOOFOLD' + String(folders.length + 1).padStart(2, '0');
    let folderIdEntry = folderId;
    if (!folder) {
      folders.push({ name: folderName, folderId, parentFolderId: baseFolderId });
    }
    let secondFolderName = null;
    if (paths.length == 3) { // second folder
      secondFolderName =  paths[2];
      const secondFolder = folders.find( i => i.name == secondFolderName );
      const secondFolderId = !!secondFolder ? secondFolder.folderId : 'IMPORTDIOOFOLD' + String(folders.length + 1).padStart(2, '0');
      folderIdEntry = secondFolderId;
      if (!secondFolder) {
        folders.push({ name: secondFolderName, folderId: secondFolderId, parentFolderId: folderId });
      }
    }
    
    let pageID = 'IMPORTDIOOPAGE' + String(index + 1).padStart(2, '0');
    let entryID = 'IMPORTDIOENTRY' + String(index + 1).padStart(2, '0');
    let ownerID = "KOJVAHHAzP2BhIJB";
    
    // console.log( file.content );
    let parsedPage;
    try {
      parsedPage = JSON.parse( file.content );
    }catch( e ) {
      console.error("Got error while parsing ", file.path );
      throw e;
    }

    // find first image in panels
    let mainImgPanel = parsedPage.panels.find( (item) => "image" in item );


    // let personAttributes = ['race','gender','age','eyes','skin','hair', 'life','profession','voice', 'faction','height','weight','traits','ideals','bonds', 'flaws','longterm','shortterm','beliefs','secret'];
    // let placeAttributes = ['age','size','government','alignment','faction','inhabitants','districts','agricultural','cultural','educational','indistrial','mercantile','military'];
    
    // parse panels and add values to attributes field
    let attributes = await panels2Attributes(parsedPage.panels);

    let pagetype = "text";

    let journal_path = path.join( folderName || '', secondFolderName || '');

    if( placesDirname && placesDirname.includes(journal_path) ) {
      pagetype = "place";
    }
    else if( personsDirname && personsDirname.includes(journal_path) ) {
      pagetype = "person";
    }

    let monksEnhancedJournalBase = {
      "type": pagetype,
      "attributes": attributes,
      "appendix":false,
      [ownerID]: {"notes": `Imported from ${parsedPage.sourceURL}` }
    };

    // extend journal based on types
    let monksEnhancedJournal = Object.assign( {}, monksEnhancedJournalBase );


    if( pagetype == "place") {
      let monksEnhancedJournalPlace = {
        placetype: ("type" in attributes) ? attributes[ "type" ].value : "",
        location: ("location" in attributes) ? attributes[ "location" ].value: "",

      };
      monksEnhancedJournal = Object.assign( monksEnhancedJournalBase, monksEnhancedJournalPlace );
    }
    else if( pagetype == "person") {
      let monksEnhancedJournalPerson = {
        role: ( ("role" in attributes) ? attributes[ "role" ].value : parsedPage.subject.honorific) || "",
        location: ("location" in attributes) ? attributes[ "location" ].value: "",
      };
      monksEnhancedJournal = Object.assign( monksEnhancedJournalBase, monksEnhancedJournalPerson );
    }
    else {
      // use default
    }

  /*  
    let panelsTables = parsedPage.panels
      .filter( panel => Object.keys( panel).length > ( "info" in panel  ? 1 : 0 ) )
      .map( panel => {
        "<table>" +  
        Object.entries(panel)
        .filter( entry => entry[0] != "info" )
        .map( entry => `<tr><td>${entry[0]}</td><td>${entry[1]}</td></tr>` )
        .join('')
        +"</table>"
      });
  */

    let mainContent = 
  `
  <div class="container">
    <div class="row">
      <div class="col-md-12">
        ${parsedPage.subtitle}
        <div>${parsedPage.authortitle}</div>
      </div>
    </div>
    <div class="row">
      <div class="article-content-left col-md-8">
        <div>${parsedPage.mainContent}</div>
        <div class="article-footnotes">${parsedPage.footnotes}</div>
      </div>
      <div class="article-content-right col-md-4">${parsedPage.rightContent}</div>
    </div>
  </div>
  `

    const journal = {
      "name": parsedPage.title,
      "flags":{
        "monks-enhanced-journal":{
          "pagetype": pagetype
        }
      },
      "pages":[
        {
          "type": "text",
          "name": parsedPage.title,
          "_id": `${pageID}`,
          "title":{"show":true,"level":1},
          "image":{},
          "text": {
            "format":1,
            "content": mainContent,
            "markdown":""},
          "video":{"controls":true,"volume":0.5},
          "src": mainImgPanel ? mainImgPanel["image"].img : null,
          "system":{},
          "sort":0,
          "ownership":{"default":-1},
          "flags":{
            "monks-enhanced-journal": monksEnhancedJournal
          }
        }
      ],
      "folder": `${folderIdEntry}`,
      "sort":0,
      "ownership":{
        "default":0,
        [ownerID]: 3
      },
      "_stats": {
        "systemId":"dnd5e",
        "systemVersion":"2.1.5",
        "coreVersion":"10.291",
        "createdTime":1679607503965,
        "modifiedTime":1679609827281,
        "lastModifiedBy": ownerID
      },
      "_id":`${entryID}`
    };
    
    console.log( JSON.stringify( journal ) );
  };

  console.log('');
  console.log('');
  console.log(baseFolder);

  folders.forEach(folder => {
    const output = templateFolderJson
      .replace('{{FOLDER_NAME}}', folder.name)
      .replace('{{PARENT_FOLDER_ID}}', folder.parentFolderId)
      .replace('{{FOLDER_ID}}', folder.folderId);
    console.log(output);
  });
}

main();

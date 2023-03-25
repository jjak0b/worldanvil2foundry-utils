const fs = require('fs');
const path = require('path');



var argv = require('yargs/yargs')(process.argv.slice(2)).argv;
/*
const fileContent = fs.readFileSync("./worldanvil/Nozioni generali/Luoghi del mondo/Doriath, la città sconsacrata.html", 'utf-8');
console.log( fileContent );
let parsedPage = JSON.parse( fileContent );
console.log( parsedPage );
return;
*/
const placesDirname  = path.resolve(argv.places);
const personsDirname = path.resolve(argv.persons);

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

fileList.forEach((file, index) => {
  
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
  
  let parsedPage = JSON.parse( file.content );

  // find first image in panels
  let mainImgPanel = parsedPage.panels.find( (item) => "image" in item );


  // let personAttributes = ['race','gender','age','eyes','skin','hair', 'life','profession','voice', 'faction','height','weight','traits','ideals','bonds', 'flaws','longterm','shortterm','beliefs','secret'];
  // let placeAttributes = ['age','size','government','alignment','faction','inhabitants','districts','agricultural','cultural','educational','indistrial','mercantile','military'];

  let pagetype = "text";

  let journal_path = path.join( folderName, secondFolderName );

  if( placesDirname.includes(journal_path) ) {
    pagetype = "place";
  }
  else if( personsDirname.includes(journal_path) ) {
    pagetype = "person";
  }

  let attributes = {};
  if( parsedPage.panels && parsedPage.panels.length ) {
    for( let i = 0; i < parsedPage.panels.length; i++) {
      let panel = parsedPage.panels[ i ];
      let keys = Object.keys( panel );
      for( let j = 0; j < keys; j++ ) {
        if( keys[j] == 'info')
          continue;
        
        attributes[ keys[j] ] = { "value": panel[ keys[j] ], "hidden": false };
      }
    }
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
      placetype: attributes[ "type" ] ? attributes[ "type" ].value : "",
      location: attributes[ "location" ] ? attributes[ "location" ].value: "",

    };
    monksEnhancedJournal = Object.assign( monksEnhancedJournalBase, monksEnhancedJournalPlace );
  }
  else if( pagetype == "person") {
    let monksEnhancedJournalPerson = {
      role: (attributes[ "role" ] ? attributes[ "role" ].value : parsedPage.subject.honorific) || "",
      location: attributes[ "location" ] ? attributes[ "location" ].value: "",
    };
    monksEnhancedJournal = Object.assign( monksEnhancedJournalBase, monksEnhancedJournalPerson );
  }
  else {
    // use default
  }
  
  let mainContent = 
  `${parsedPage.subtitle}
  <div>
    <div>${parsedPage.mainContent}</div>
    <div>
      ${parsedPage.otherInfo}
      <hr>
      ${parsedPage.panels.filter( ( panel ) => "info" in panel ).map( (panel) => panel.info ) }
    </div>
    <div>${parsedPage.footnotes}</div>
  </div>`;

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
});

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


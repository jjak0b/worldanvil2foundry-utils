const fs = require('fs');
const path = require('path');
const { ensureArrayOfPaths } = require("./libs/utils");
const { adapt2Journal } = require("./libs/journal-adapter");

var argv = require('yargs/yargs')(process.argv.slice(2)).argv;

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
        dirpath: path.dirname( path.resolve( filePath ) ),
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
  let parsedPage;
  let journal;

  let directoriesTypes = {
    dirnamesPerson:  ensureArrayOfPaths(argv.persons),
    dirnamesPlace: ensureArrayOfPaths(argv.places),
    dirnamesOrganization: ensureArrayOfPaths(argv.orgs),
    dirnamesPOI: ensureArrayOfPaths(argv.pois),
  };

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
    
    journal = null;
    parsedPage = null;

    try {
      parsedPage = JSON.parse( file.content );
      journal = await adapt2Journal( parsedPage, file, directoriesTypes, pageID, entryID, folderIdEntry, ownerID);
      console.log( JSON.stringify( journal ) );
    }catch( e ) {
      console.error("Got error while parsing ", file.path );
      throw e;
    }
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

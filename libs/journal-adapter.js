const{ translate } = require('bing-translate-api');

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
            cases: ["weight", "load"],
            value: "weight"
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
  
function searchInPanels( panels, searchkey ) {
    for( const items of panels ) {
      let item = items.find( item => searchkey in item );
      if( item ) return item;
    }
    return undefined;
}


async function adapt2Journal( parsedPage, file, directoriesTypes, pageID, entryID, folderIdEntry, ownerID) {

    const dirnamesPerson = directoriesTypes.dirnamesPerson;
    const dirnamesPlace = directoriesTypes.dirnamesPlace;
    const dirnamesOrganization = directoriesTypes.dirnamesOrganization;
    const dirnamesPOI = directoriesTypes.dirnamesPOI;

    const personAttributes = ['race','gender','age','eyes','skin','hair', 'life','profession','voice', 'faction','height','weight','traits','ideals','bonds', 'flaws','longterm','shortterm','beliefs','secret'];
    const placeAttributes = ['age','size','government','alignment','faction','inhabitants','districts','agricultural','cultural','educational','indistrial','mercantile','military'];

    // find first image in panels
    let mainImgPanel = searchInPanels( parsedPage.panels, "image" );
    
    // parse panels and add values to attributes field
    let attributes = await panels2Attributes(parsedPage.panels);

    // console.log( attributes );
    let pagetype = "text";

    const isPathForTypeTest = (apath) => file.dirpath.includes( apath );

    if( dirnamesPlace.some(isPathForTypeTest) ) {
      pagetype = "place";
    }
    else if( dirnamesPOI.some(isPathForTypeTest) ) {
      pagetype = "poi";
    }
    else if( dirnamesPerson.some(isPathForTypeTest) ) {
      pagetype = "person";
    }
    else if( dirnamesOrganization.some(isPathForTypeTest) ) {
      pagetype = "organization";
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
      for ( const _attr of placeAttributes ) {
        if( !(_attr in attributes) ) attributes[ _attr ] = { "value": '',  "hidden": true }
      }
      let monksEnhancedJournalPlace = {
        placetype: ("placetype" in attributes) ? attributes[ "placetype" ].value : "",
        location: ("location" in attributes) ? attributes[ "location" ].value: "",
      };
      monksEnhancedJournal = Object.assign( monksEnhancedJournal, monksEnhancedJournalPlace );
    }
    else if( pagetype == "person") {
      for ( const _attr of personAttributes ) {
        if( !(_attr in attributes) ) attributes[ _attr ] = { "value": '',  "hidden": true }
      }
      let monksEnhancedJournalPerson = {
        role: ( ("role" in attributes) ? attributes[ "role" ].value : parsedPage.subject.honorific) || "",
        location: ("location" in attributes) ? attributes[ "location" ].value: "",
      };
      monksEnhancedJournal = Object.assign( monksEnhancedJournal, monksEnhancedJournalPerson );
    }
    else if( pagetype == "organization" ) {
      let monksEnhancedJournalOrg = {
        role: ( "alignment" in attributes ) ? attributes[ "alignment" ].value: "",
        location: ( "location" in attributes ) ? attributes[ "location" ].value: "",
      };
      monksEnhancedJournal = Object.assign( monksEnhancedJournal, monksEnhancedJournalOrg );
    }
    else if( pagetype == "poi" ) {
      let monksEnhancedJournalPOI = {
        location: ( "location" in attributes ) ? attributes[ "location" ].value: "",
      };
      monksEnhancedJournal = Object.assign( monksEnhancedJournal, monksEnhancedJournalPOI );
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

  let subjectname = [parsedPage.subject.firstname, parsedPage.subject.middlename, parsedPage.subject.lastname]
  .filter( str => str ).join(" ");

  let mainContent = 
`
  <div class="container">
    <div class="row">
      <div class="col-md-12">
        ${parsedPage.subtitle || ''}
        ${parsedPage.authortitle ? `<div class="m-b-20 article-title-author">${parsedPage.authortitle}</div>` : ''}
      </div>
    </div>
    <div class="row">
      <div class="article-content-left col-md-8">
        ${ subjectname ? `<h3>${subjectname}</h3>` : '' }
        <div>${parsedPage.mainContent || ''}</div>
        <div class="article-footnotes">${parsedPage.footnotes || ''}</div>
      </div>
      <div class="article-content-right col-md-4">${parsedPage.rightContent || ''}</div>
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
          "src": mainImgPanel && "image" in mainImgPanel ? mainImgPanel["image"].img : null,
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

    return journal;
}


module.exports = {
    adapt2Journal
};
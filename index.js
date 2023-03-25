const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { mainModule } = require('process');
const{ translate } = require('bing-translate-api');

// Get the directory of the script
const scriptDir = path.join(path.dirname(process.argv[1]), 'worldanvil');

// List of objects with path and link
const files = JSON.parse( fs.readFileSync( process.argv[2] || "./urls.json" ) );

// Function to download the file and save it to the corresponding path
async function fetchPage(uri) {
    const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
    const response = await axios.get(uri.link, { responseType: 'arraybuffer', headers });
    return response.data;
}

function clearTag( tag ) {

    // if( tag.first() == null ) return tag;
    
    tag.find('script').remove();
    tag.find('style').remove();
    tag.find('ins').remove();
    tag.find('i').remove();
    
    let content = tag.prop('outerHTML');

    if( content == null ) return tag;

	// replace tabs
	content = content.replace(/\s\s\s\s/g, '');

	// replace &nbsp;
	content = content.replaceAll('&nbsp;', '');

    // remove comments
    content = content.replace(/<!--.*-->/g, '');

    // remove style
    content = content.replace(/<style\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/style>/gi, '');

    // remove this useless string
    content = content.replace('Remove these ads.', '');
    content = content.replace('Join the Worldbuilders Guild', '');

    // remove all attributes from all HTML tags
    content = content.replace(/<(\w+)([^>]*)>/g, '<$1>');

    // remove script tags from the content
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
	
	// remove div tags
	// content = content.replaceAll('<div>', '');
	// content = content.replaceAll('</div>', '');
	
	// remove em tags
	// content = content.replaceAll('<em>', '');
	// content = content.replaceAll('</em>', '');
	
	// remove a tags
	// content = content.replaceAll('<a>', '');
	// content = content.replaceAll('</a>', '');
	
	// remove img tags
	// content = content.replaceAll('<img>', '');
	// content = content.replaceAll('</img>', '');
	
	// replace empty new line
	content = content.replace(/\n\s*\n/gm, '');

    // remove empty tags from the content
    content = content.replace(/<[^/>][^>]*>\s*<\/[^>]+>|<[^/>][^>]*><\/>/g, '');
    content = content.replace(/<[^/>][^>]*>\s*<\/[^>]+>|<[^/>][^>]*><\/>/g, '');
	
	// replace empty new line
	content = content.replace(/\n\s*\n/gm, '');

    tag = tag.html( content );
    

    // console.log( "<!-> " + tag.html() + "<-!>" )

    return tag;
}

// translate keys to standard names
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

    return stdKey ? stdKey : key;

}

async function parseHTML(html, resource ) {
	
    let url = new URL( resource.link );

    const categoryPath = resource.path;

	const $ = cheerio.load(html);

    const page = $('#content');

    const leftSection = $(".article-content-left");
    const rightSection = $(".article-content-right");

    rightSection.find(".text-center").last().remove();

    const subject = leftSection.find(".person-fullname").first();



    
    let characterDetails = null;

    let panels = [];

    // parse right panels
    rightSection.find(".panel").each( (idxPanel, panelEl) => {
        let items = [];
        
        let panelBody = $(panelEl).find(".panel-body").first();
        // parse panels
        panelBody.find(".visibility-toggler").each( (elidx, element) => {
            let href = null;
            let img = null;
            let key = null;
            let text = null;

            if( $(element).hasClass('user-css-image-thumbnail') || $(element).hasClass('image-thumb-container') ) {
                key = "image";

                let imgEl = $(element).find("img[src]");
                img = imgEl.length ? imgEl.attr('src') : null;

                if( img.startsWith("/") ) {
                    img = new URL( img, url.origin).toString();
                }

                items.push( [
                    key,
                    {
                        img: img,
                    }
                ]);

                console.log( items );
            }
            else {
                // key, value item
                let keyEl = $(element).find(".section-title");
                key = keyEl.text().trim();

                let valueEl = $(element).find(".section-payload");
                text = valueEl.text().trim();

                let linkEl = valueEl.find("a[href]");
                href = linkEl.length ? linkEl.attr('href') : null;

                items.push( [
                    key,
                    {
                        href: href,
                        text: text
                    }
                ]);
            }
            $(element).remove();
        });

        if( panelBody ) {
            items.push( [ "info", clearTag( panelBody ).prop("innerHTML") ] );
        }

        panels.push( items );
        $(panelEl).remove();
    });

    let panelsData = []
    // process panels
    for( let idx = 0; idx < panels.length; idx++ ) {
        let items = panels[ idx ];
        // translate keys to standard names
        let keys = items.map(item => item[0] );
        // we can hit limit usage
        try {
            let { translation, correct, correctedText }= await translate(keys.join(" ## "), null, 'en' );
            translated = correct && correctedText && correctedText.length > 0 ? correctedText : translation;
            keys = translated.split(" ## ").map( s => s.toLowerCase() );
        } catch (e) {
            if (e.name === 'TooManyRequestsError') {
                console.error( "TooManyRequestsError" );
            }
            console.error( "Error while translating keys, reason:", e );
        }
        let panelData = {}
        items.map( (item, index) => {
            panelData[ engKey2Standard(keys[ index ]) ] = item[ 1 ];
        });
        
        panelsData.push( panelData );
    }

    return {
        sourceURL: url.toString(),
        categoryPath: categoryPath,
        title: clearTag( page.find(".article-title > h1").first() ).text().trim() || null,
        subtitle: clearTag( page.find(".article-subheading").first() ).prop('innerHTML').trim() || null,
        subject: !subject ? null : {
            firstname: clearTag( subject.find(".person-firstname").first() ).text().trim() || null,
            middlename: clearTag( subject.find(".person-middlename").first() ).text().trim() || null,
            lastname: clearTag( subject.find(".person-lastname").first() ).text().trim() || null,
            honorific: clearTag( subject.find(".person-honorific").first() ).text().trim() || null
        },
        mainContent: clearTag( leftSection.find(".user-css-vignette").first() ).prop('innerHTML') || "",
        // right section panels (parsed) data
        panels: panelsData,
        // left content on right section
        otherInfo: clearTag( rightSection ).prop('innerHTML').trim() || null,
        footnotes: clearTag( leftSection.find(".article-footnotes") ).prop('innerHTML').trim() || null,
    };

}




async function main() {

Promise.all(
    files.map( file => fetchPage(file)
            .then( async htmlContent => await parseHTML( htmlContent, file ) )
            .then( async obj => new Promise( (resolve, reject) => {
                // const json = JSON.stringify( obj, null, 4 );
                const json = JSON.stringify( obj );
                console.log( json );

                const filePath = path.join(scriptDir, file.path);
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                  fs.mkdir(dir, { recursive: true }, (err) => {
                    if( err ) reject( err );
                    fs.writeFile(filePath, json,  'utf-8', (err) => {
                        if( err ) reject( err );
                        resolve();
                    });
                  });
                }
                else {
                    fs.writeFile(filePath, json,  'utf-8', (err) => {
                        if( err ) reject( err );
                        resolve();
                    });
                }
            }))
            // .then( (value) => console.log( value ) )
            
    )
)
  .then(() => console.log('All files downloaded successfully'))
  .catch(error => console.error(`Error while downloading files: ${error}`));
}

main();
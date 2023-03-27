
const path = require('path');
const axios = require('axios');

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
	// content = content.replace(/\s\s\s\s/g, '');

	// replace &nbsp;
	// content = content.replaceAll('&nbsp;', '');

    // remove comments
    content = content.replace(/<!--.*-->/g, '');

    // remove style
    // content = content.replace(/<style\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/style>/gi, '');

    // remove this useless string
    content = content.replace('Remove these ads.', '');
    content = content.replace('Join the Worldbuilders Guild', '');

    // remove all attributes from all HTML tags
    content = content.replace(/<((?!img|a)\w+)([^>]*)>/g, '<$1>');

    // remove script tags from the content
    // content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
	
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
	// content = content.replace(/\n\s*\n/gm, '');

    // remove empty tags from the content
    // content = content.replace(/<[^/>][^>]*>\s*<\/[^>]+>|<[^/>][^>]*><\/>/g, '');
    // content = content.replace(/<[^/>][^>]*>\s*<\/[^>]+>|<[^/>][^>]*><\/>/g, '');
	
	// replace empty new line
	content = content.replace(/\n\s*\n/gm, '');

    tag = tag.html( content );
    

    // console.log( "<!-> " + tag.html() + "<-!>" )

    return tag;
}


function trimSafe(str) {
    return str != null ? str.trim() : null;
}

function ensureArrayOfPaths( itemOrarray ) {
    let myarray = [];
    if( itemOrarray ) {
      if( itemOrarray instanceof Array ) {
        myarray = itemOrarray;
      }
      else {
        myarray = [ itemOrarray ];
      }
      return myarray.map( customPath => path.resolve( customPath ) );
    }
    return myarray;
  }

module.exports = {
    trimSafe,
    fetchPage,
    clearTag,
    ensureArrayOfPaths
};
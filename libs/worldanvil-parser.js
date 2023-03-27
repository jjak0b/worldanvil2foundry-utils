const cheerio = require('cheerio');
const { clearTag, trimSafe } = require("./utils");

function parsePanelEntry( $, element ) {
    let href = null;
    let img = null;
    let key = null;
    let text = null;

    if( $(element).hasClass('user-css-image-thumbnail') || $(element).hasClass('image-thumb-container') ) {
        key = "image";

        let imgEl = $(element).find("img[src]");
        img = imgEl.length ? imgEl.attr('src') : null;

//        if( img.startsWith("/") ) {
//            img = new URL( img, url.origin).toString();
//        }

        return {
            [key]: {
                img: img,
            }
        };

        // console.log( items );
    }
    else {
        // key, value item
        let keyEl = $(element).find(".section-title");
        key = keyEl.text().trim();

        let payloadEl = $(element).find(".section-payload");

        let valueEl = payloadEl.length ? payloadEl : $(element);
        if( $(valueEl).find( "ul" ).length ) {
            let items = [];
            $(valueEl).find( "ul > li").each( (liIdx, liEl) => {
                items.push( parsePanelEntry( $, liEl ) );
            });
            return {
                [key]: {
                    list: items
                }
            }
        }
        else if( valueEl.find("a[href]").length ) {
            text = valueEl.text().trim();
            let linkEl = valueEl.find("a[href]");
            href = linkEl.length ? linkEl.attr('href') : null;

            return {
                [key]: {
                    href: href,
                    text: text
                }
            }
        }
        else {
            text = valueEl.text().trim();
            
            return {
                [key]: {
                    text: text
                }
            }
        }
    }
}

async function parseHTML(html, resource ) {
    
    console.log( "Parsing: ", resource.path )
    let url = new URL( resource.link );

    const categoryPath = resource.path;

	const $ = cheerio.load(html);

    const page = $('#content');

    const leftSection = $(".article-content-left");
    const rightSection = $(".article-content-right");

    rightSection.find(".text-center").last().remove();

    const subject = leftSection.find(".person-fullname").first();

    let panels = [];

    // parse right panels infos
    rightSection.find(".panel").each( (idxPanel, panelEl) => {
        let items = [];
        
        // use absolute urls
        $('a[href], img[src]').each((i, el) => {
            const $el = $(el);
            const attr = $el.is('a') ? 'href' : 'src';
            $el.attr(attr, new URL( $el.attr(attr), url.origin).toString());
        });
        
        let panelBody = $(panelEl).find(".panel-body").first();
        // parse panels
        $(panelEl).find(".panel-body > .visibility-toggler").each( (elidx, element) => {
            items.push( parsePanelEntry( $, element ) );
            // $(element).remove();
        });

        // not sure if use this
        if( panelBody && panelBody.length ) {
            // items.push( [ "info", clearTag( panelBody ).prop("innerHTML") ] );
        }

        panels.push( items );
        // $(panelEl).remove();
    });

    let panelsData = panels;

    let title = trimSafe( clearTag( page.find(".article-title > h1").first() ).text() ) || null;
    let subtitle = trimSafe( clearTag( page.find(".article-subheading").first() ).prop('innerHTML') ) || null;
    let subject_firstname = trimSafe( clearTag( subject.find(".person-firstname").first() ).text() ) || null;
    let subject_middlename = trimSafe( clearTag( subject.find(".person-middlename").first() ).text() ) || null;
    let subject_lastname = trimSafe(clearTag( subject.find(".person-lastname").first() ).text() ) || null;
    let subject_honorific = trimSafe( clearTag( subject.find(".person-honorific").first() ).text() ) || null;
    let authortitle = trimSafe( clearTag( subject.find(".article-title > .article-title-author").first() ).text() ) || null;
    let mainContent = trimSafe( clearTag( leftSection.find(".user-css-vignette").first() ).prop('innerHTML') ) || "";
    let rightContent = trimSafe( clearTag( rightSection ).prop('innerHTML') ) || null;
    let footnotes = trimSafe( clearTag( leftSection.find(".article-footnotes") ).prop('innerHTML') ) || null;
    

    return {
        sourceURL: url.toString(),
        categoryPath: categoryPath,
        title: title,
        subtitle: subtitle,
        authortitle: authortitle,
        subject: !subject ? null : {
            firstname: subject_firstname,
            middlename: subject_middlename,
            lastname: subject_lastname,
            honorific: subject_honorific
        },
        mainContent: mainContent,
        // right section parsed data
        panels: panelsData,
        // content on right section
        rightContent: rightContent,
        footnotes: footnotes,
    };

}


module.exports = {
    parse: parseHTML
};
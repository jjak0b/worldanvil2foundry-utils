# worldanvil2foundry-utils

## Parse Worldanvil pages to JSON

Create a `urls.json` that contains a list in JSON format like the following example:

```
[
    {
        "path": "Directory1/SubDirectory1/your-article-name.json",
        "link": "https://www.worldanvil.com/path/to/your/article1"
    },
    {
        "path": "Directory1/SubDirectory2/your-article-name2.json",
        "link": "https://www.worldanvil.com/path/to/your/article2"
    },
        {
        "path": "Directory2/SubDirectory1/your-article-name2.json",
        "link": "https://www.worldanvil.com/path/to/your/article3"
    }
]
```

Run the following command to fetch and parse articles data:

```
node index.js ./path/to/your/urls.json
```

It will create the directory tree with the articles in `./worldanvil` folder.

## Parse JSON articles to Foundry [Monk's Enhanced Journal](https://foundryvtt.com/packages/monks-enhanced-journal)

Run the following command to adapt the content of parsed articles to Foundry journals and directories, compatible with the module Monk's Enhanced Journal :

```
node file-to-foundryjson.js [options] > out.json
```

where options are the following repeteable arguments options:
`--persons=./worldanvil/my/person-like/directory`
`--places=./worldanvil/my/place-like/directory`
`--orgs=./worldanvil/my/organization-like/directory`
`--pois=./worldanvil/my/poi-like/directory`

**Note**: Don't add the trailing `/`.
These options are required if you need to adapt all articles contained in all sub-directories specificed in a option to a specific Monk's Enhanced Journal type.
if not specified by any options, all articles will be adapted to text type by default.
**Note**: You can use the same option multiple times if you want to specify multiple directories for same type, like the following example:

```
node file-to-foundryjson.js --persons=./worldanvil/good-npc --persons=./worldanvil/others/bad-npc --orgs=./worldanvil/good-organizations
```

## How to add to Foundry

The `file-to-foundryjson.js ... > out.json` command will create a `out.json` file containing 2 sections separated by empty lines:
1. The first one contains a list of journals that you have to **APPEND** to the end of your `FoundryVTT data install path location/Data/worlds/YOUR WORLD/data/journal.db` file

1. The second one contains a list of directoties that you have to **APPEND** to the end of your `FoundryVTT data install path location/Data/worlds/YOUR WORLD/data/folders.db` file


## Compatibility notes

It has been tested with the version `10.14` of `Monk's Enhanced Journal` module with foundry version `10`.
The `Monk's Enhanced Journal` API or `Worldanvil` articles structure may change in the future, so web scraping and adapting journals are not guaranteed to works in the future.


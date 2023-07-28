const contentfulExport = require('contentful-export')
const contentfulImport = require('contentful-import')
const ULID = require('ulid')
const FileSystem = require("fs");

const oldTag = "OLD TAG";
const newTag = "NEW TAG";
const sourceEnv = "dev"
const destEnv = "dev"

const auth = {
  spaceId: 'SPACE_ID',
  managementToken: 'MANAGEMENT_TOKEN',
}

const options = {
  ...auth,
  skipContentModel: true,
  exportDir: './exports',
  environmentId: sourceEnv
}

const mapContent = (content) => ({
  ...content,  
  metadata: { ...content.metadata, tags: [{sys:{ ...(content.metadata.tags.find(tag => tag.sys.id === oldTag)).sys, id: newTag }}]}
})

const getIdCouples = (contents) => {
  const ids =  [ ...new Set(contents.map(content => content.sys.id))];

  return ids.reduce( (acc, curr ) => ({...acc, [curr]: ULID.ulid() }) , [])
}

const replaceKeyValue = (contents, keys, index = 0) => {
  const currKey = Object.keys(keys)[index];
  if(index -1 === Object.keys(keys).length) return contents.replaceAll(currKey, keys[currKey])
  return replaceKeyValue(contents.replaceAll(currKey, keys[currKey]), keys, index + 1)
}

const filterTag = (content) => content.metadata.tags.find(tag => tag.sys.id === oldTag) && content.metadata.tags.length === 1

contentfulExport(options)
  .then((result) => {
    const entries = result.entries.filter(filterTag).map(mapContent);
    const assets = result.assets.filter(filterTag).map(mapContent);
    const allContent = { entries, assets };

    const keys = getIdCouples([...entries, ...assets])
    const content = JSON.parse(replaceKeyValue( JSON.stringify(allContent),keys))

    const options = {
      content,
      ...auth,
      environmentId: destEnv
    }

    contentfulImport(options)
      .then(() =>  console.log('Data imported successfully'))
      .catch((err) => console.error('Error during the import', err))
    console.log(content)

    FileSystem.writeFile('file.json', JSON.stringify({assets, entries}), (error) => {
      if (error) throw error;
    });
  })
  .catch((err) => {
    console.error('Something went wrong during the copy', err)
  })
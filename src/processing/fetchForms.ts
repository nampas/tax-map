import * as Cheerio from 'cheerio';
import fetch from 'node-fetch';
import sanitize from 'sanitize-filename';

const INSTRUCTIONS_URL = 'https://www.irs.gov/instructions';
const SEARCH_TERM = 'Instructions for ';

const extractTextFromUrl = async (url) => {
  console.log(`Extracting text from ${url}`);
  return url;
};

const formUrlsFromHtml = (html) => {
  const $ = Cheerio.load(html);
  const matches = $('a', 'tbody');

  const result = []
  matches.each((i, elem) => {
    const text = (elem.children[0] || {}).data || '';
    if (text.startsWith(SEARCH_TERM)) {
      const name = text.substring(SEARCH_TERM.length).trim();
      result.push([name, elem.attribs.href])
    }
  });

  console.log(`Found ${result.length} form urls`);
  
  return result;
}

const fetchFormUrls = async (): Promise<string[]>  => {
  return fetch(INSTRUCTIONS_URL)
    .then(resp => resp.text())
    .then(formUrlsFromHtml);
};

const writeFile = async (name, data, dir) => {
  // Get rid of whitespace
  const filename = sanitize(`${name.replace(/\s/g, '')}.txt`, {
    replacement: (char) => char === '/' ? '-' : '_'
  });
  console.log(`Writing file ${dir}/${filename}`);
};


const execute = async () => {
  const forms = await fetchFormUrls();
  const dir = process.argv[2];
  console.log(`Writing form data to ${dir}`);
  forms.forEach(async ([name, url]) => {
    const text = await extractTextFromUrl(url);
    await writeFile(name, text, dir);
  });
}

console.log(process.argv);

execute();


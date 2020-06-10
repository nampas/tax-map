import * as Cheerio from 'cheerio';
import fetch from 'node-fetch';
import sanitize from 'sanitize-filename';
import { join } from 'path';
import { mkdirSync, writeFile } from 'fs';
import { PREFIX_DELIM } from '../util/util';

const INSTRUCTIONS_URL = 'https://www.irs.gov/instructions';
const SEARCH_TERM = 'Instructions for ';

interface IFormsAndUrl {
  names: string[];
  url: string
}

const extractTextFromUrl = async (url) => {
  return fetch(url).then((resp) => {
    if (resp.ok) {
      return resp.text();
    }

    throw new Error(`${url} ${resp.status}`);
  });
};

const extractFormNames = (text): string[] => {
  const trimmed = text.substring(SEARCH_TERM.length).trim();
  // Remove the date
  const [type, ...names] = trimmed.split(' ').slice(0, -1);
  if (type === 'Forms') {
    // e.g:
    // Forms 8804, 8805, and 8813 (2019)
    // Forms 1094-B and 1095-B (2019)
    names.pop();
    return names
      .filter(n => n && n.trim() !== 'and')
      .map(n => `Form ${n.trim().replace(',', '')}`);
  } else if (type === 'Form') {
    // e.g:
    // Form 8582-CR (12/2019)
    // Form 8594 (12/2012)
    return [`Form ${names[0]}`];
  } else if (type === 'Schedule') {
    return [`Schedule ${names.join('_')}`];
  }

  return trimmed;
};

const formUrlsFromHtml = (html): IFormsAndUrl[] => {
  const $ = Cheerio.load(html);
  const matches = $('a', 'tbody');

  const result = []
  matches.each((i, elem) => {
    const text = (elem.children[0] || {}).data || '';
    if (text.startsWith(SEARCH_TERM)) {
      const names = extractFormNames(text);
      console.log(names);
      result.push({
        names,
        url: elem.attribs.href
      });
    }
  });

  console.log(`Found ${result.length} form urls`);
  
  return result;
}

const fetchFormUrls = async (): Promise<IFormsAndUrl[]>  => {
  return fetch(INSTRUCTIONS_URL)
    .then(resp => {
      if (!resp.ok) throw new Error(`Error fetching ${INSTRUCTIONS_URL} ${resp.status}`);
      return resp.text();
    })
    .then(formUrlsFromHtml);
};

const writeForm = async (formName, data, dir) => {
  // Get rid of whitespace
  const filename = sanitize(`${formName.replace(/\s/g, '')}.txt`, {
    replacement: (char) => char === '/' ? '-' : '_'
  });

  const content = `${formName}\n${PREFIX_DELIM}\n${data}`;

  return new Promise((resolve, reject) => {
    writeFile(join(dir, filename), content, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
};

const execute = async () => {
  const dir = process.argv[2];
  mkdirSync(dir, { recursive: true });

  const forms = await fetchFormUrls();
  const failures = [];
  forms.forEach(async ({ names, url }) => {
    try {
      const text = await extractTextFromUrl(url);
      names.forEach(async n => await writeForm(n, text, dir));
    } catch (error) {
      failures.push(error.message);
    }
  });

  console.log(`${failures.length} / ${forms.length} forms failed`);
  console.log(failures);
}

execute();

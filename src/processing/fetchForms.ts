import * as Cheerio from 'cheerio';
import fetch from 'node-fetch';
import sanitize from 'sanitize-filename';
import { join } from 'path';
import { mkdirSync, writeFile } from 'fs';
import { PREFIX_DELIM, FORM_MATCH } from '../util/util';

const INSTRUCTIONS_URL = 'https://www.irs.gov/instructions';
const SEARCH_TERM = /(2019\s)?Instructions\sfor\s/i;

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

const extractFormNames = (text, regexMatch): string[] => {
  const trimmed = text.substring(regexMatch[0].length).trim();
  // Remove the date
  const [type, ...names] = trimmed.split(' ').slice(0, -1);
  if (type === 'Forms') {
    // e.g:
    // Forms 8804, 8805, and 8813 (2019)
    // Forms 1094-B and 1095-B (2019)
    names.pop();
    return names
      .filter(n => n && n.trim() !== 'and' && n.trim() !== 'or')
      .map(n => `Form ${n.trim().replace(',', '')}`);
  } else if (type === 'Form') {
    // e.g:
    // Form 8582-CR (12/2019)
    // Form 8594 (12/2012)
    return [`Form ${names[0].trim()}`];
  } else if (type === 'Schedule') {
    // e.g.
    // Schedule B (Form 941) (01/2017)
    // Schedule E (2019)
    // If no form is indicated, then 1040 is implied
    const form = (trimmed.match(new RegExp(FORM_MATCH)) || ['Form 1040'])[0];
    return [`Schedule ${names[0].trim()} ${form}`];
  }

  return trimmed;
};

const formUrlsFromHtml = (html): IFormsAndUrl[] => {
  const $ = Cheerio.load(html);
  const matches = $('a', '.pup-main-container');

  const result = []
  matches.each((i, elem) => {
    const text = ((elem.children[0] || {}).data || '').trim();
    const match = text.match(SEARCH_TERM);
    if (match) {
      const names = extractFormNames(text, match);
      result.push({
        names,
        url: elem.attribs.href
      });
    } else if (text.startsWith('1040')) {
      // For whatever reason, 1040 is very special and is just `1040 (2019)`,
      // unlike every other form which is `Instructions For Form XYZ (2019)`.
      const fakeText = `Instructions for Form 1040 (2019)`;
      result.push({
        names: extractFormNames(fakeText, fakeText.match(SEARCH_TERM)),
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

const writeForm = async (formName, data, dir, url) => {
  // Get rid of whitespace
  const filename = sanitize(`${formName.replace(/\s/g, '')}.txt`, {
    replacement: (char) => char === '/' ? '-' : '_'
  });

  const now = new Date().toISOString();
  const content = [formName, url, now, PREFIX_DELIM, data].join('\n');

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
      await names.forEach(async n => await writeForm(n, text, dir, url));
    } catch (error) {
      failures.push(error.message);
    }
  });

  console.log(`${failures.length} / ${forms.length} forms failed`);
  console.log(failures);
}

execute();

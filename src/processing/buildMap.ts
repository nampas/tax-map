import { readdirSync, lstatSync, readFileSync, writeFile } from 'fs';
import { join } from 'path';
import { PREFIX_DELIM, FORM_MATCH } from '../util/util';

const MAP_FILE = 'gen_map.js';

const cleanFormName = (form) => {
  // Get rid of the plurals
  const res = form.replace('(s)', '')
  // Represent 1040 schedules as a 1040 variant
  const match = res.match(/^Schedule\s(.*)\sForm\s1040/);
  return match 
    ? `Form 1040-S${match[1].toUpperCase()}`
    : res;
}

const processForm = (path, graph) => {
  const [header, fullDoc] = readFileSync(path, "utf8").split(PREFIX_DELIM);

  const [f, url, dateFetched] = header.split('\n');
  const thisForm = f.trim();
  console.log(`building map for ${thisForm}`);

  // This is hacky, but we need to ignore everything above the main container.
  const doc = fullDoc.split('pup-main-container')[1];

  // Extract pointers to other forms
  // Forms look like:
  //     Form 990-EZ
  //     Form 1045
  const referencedForms = doc.match(new RegExp(FORM_MATCH, 'g')) || [];

  // Extract pointers to other schedules
  // Schedules look like:
  //     Schedule(s) K-1 (Form 1041)
  //     Schedule D (Form 1040)
  //     Schedule A
  const scheduleMatch
    = `Schedule(\\(s\\))?\\s([0-9]|[A-Z]|-)+(\\s\\(${FORM_MATCH}\\))?`;
  const referencedSchedules = doc.match(new RegExp(scheduleMatch, 'g'));

  const referenced = Array.from(
    new Set(referencedForms.concat(referencedSchedules)));
  
  graph[cleanFormName(thisForm)] = {
    raw: referenced,
    cleaned: referenced
      .filter(r => r && r !== thisForm)
      .map(cleanFormName),
    metadata: { url, dateFetched, form: thisForm }
  };
};

const saveGraph = async (data) => {
  const path = MAP_FILE;
  const content = `/* global window */\nwindow.__map_data = ${JSON.stringify(data)}`;

  return new Promise((resolve, reject) => {
    writeFile(path, content, function (err) {
      if (err) reject(err);
      else resolve(path);
    });
  });
};

const execute = async () => {
  const dir = process.argv[2];
  const items = readdirSync(dir);
  if (!items.length) {
    throw new Error(`No form data found in ${dir}`);
  }

  const graph = items.reduce((acc, item) => {
    const path = join(dir, item);
    if (item !== MAP_FILE && lstatSync(path).isFile()) {
      processForm(path, acc);
    }

    return acc;
  }, {});

  const path = await saveGraph(graph);
  console.log(`Map generated and saved to ${path}`);
};

execute();

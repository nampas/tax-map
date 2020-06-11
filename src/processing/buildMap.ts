import { readdirSync, lstatSync, readFileSync, writeFile } from 'fs';
import { join } from 'path';
import { PREFIX_DELIM } from '../util/util';

const MAP_FILE = '_gen_map.json';

const processForm = (path, graph) => {
  const [f, doc] = readFileSync(path, "utf8").split(PREFIX_DELIM);

  const thisForm = f.trim();
  console.log(`building map for ${thisForm}`);
  // Extract pointers to other forms
  // Forms look like:
  //     Form 990-EZ
  //     Form 1045
  const formMatch = 'Form\\s[0-9]+(-[A-Z]+)?(-[A-Z]+)?';
  const referencedForms = doc.match(new RegExp(formMatch, 'g')) || [];

  // Extract pointers to other schedules
  // Schedules look like:
  //     Schedule(s) K-1 (Form 1041)
  //     Schedule D (Form 1040)
  //     Schedule A
  const scheduleMatch
    = `Schedule(\\(s\\))?\\s([0-9]|[A-Z]|-)+(\\s\\(${formMatch}\\))?`;
  const referencedSchedules = doc.match(new RegExp(scheduleMatch, 'g'));

  const referenced = Array.from(
    new Set(referencedForms.concat(referencedSchedules)));
  
  graph[thisForm] = {
    raw: referenced,
    cleaned: referenced
      .filter(r => r && r !== thisForm)
      // Get rid of the plurals
      .map(r => r.replace('(s)', ''))
  };
};

const saveGraph = async (data, dir) => {
  const path = MAP_FILE;

  return new Promise((resolve, reject) => {
    writeFile(path, JSON.stringify(data), function (err) {
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

  const path = await saveGraph(graph, dir);
  console.log(`Map generated and saved to ${path}`);
};

execute();

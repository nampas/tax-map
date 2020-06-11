
const buildMapData = () => {
  const input = window.__map_data;
  return Object.keys(input).reduce((acc, key) => {
    acc.push({ id: key });
    input[key].cleaned.forEach(tgt => {
      acc.push({ id: key + '-' + tgt, source: key, target: tgt });
    });
    return acc;
  }, []);
}

window.onload = () => {
  const elements = buildMapData();
  var cy = cytoscape({
    container: document.getElementById('map-content'),
    elements,
    style: [ // the stylesheet for the graph
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(id)'
        }
      },

      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      }
    ],

    layout: null
  });
};

/* global window, console, cytoscape, document */
(function() {
  const data = {};

  const nodeId = (form) => form
    .replace(/Form/g, 'F')
    .replace(/Schedule/g, 'S')
    .replace(/(\(|\))/g, '')
    .replace(/\s/, '_');

  const buildMapData = () => {
    const input = window.__map_data;
    // Until I can spend more time cleaning the data, we have to be careful not to
    // create edges to unknown nodes
    const allNodeIds = Object.keys(input).reduce((acc, key) => {
      acc[nodeId(key)] = 1;
      return acc;
    }, {});

    return Object.keys(input).reduce((acc, key) => {
      const srcId = nodeId(key);
      acc.push({ data: { id: srcId, lbl: key }});
      input[key].cleaned.forEach(tgt => {
        const tgtId = nodeId(tgt);

        if (allNodeIds[tgtId]) acc.push({ data: { id: srcId + '-' + tgtId, source: srcId, target: tgtId }});
      });
      return acc;
    }, []);
  }

  const onNodeClick = (event) => {
    const form = event.target.data().lbl;
    console.log(window.__map_data[form]);
  }

  window.onload = () => { 
    var cy = cytoscape({
      container: document.getElementById('map-content'),
      elements: buildMapData(),
      style: [ // the stylesheet for the graph
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(lbl)'
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

      layout: {
        name: 'circle',
        avoidOvelap: true,
        spacingFactor: 1.2
      }
    });
    cy.nodes().on('click', onNodeClick);
    data.cy = cy;
  };

})();

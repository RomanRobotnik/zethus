import { CONSTANTS } from 'amphion';
import _ from 'lodash';
import { TF_MESSAGE_TYPES } from './vizOptions';

const { DEFAULT_OPTIONS_SCENE } = CONSTANTS;

export const ROS_SOCKET_STATUSES = {
  INITIAL: 'Idle. Not Connected',
  CONNECTING: 'Connecting',
  CONNECTED: 'Connected successfully',
  CONNECTION_ERROR: 'Error in connection',
};

export const getTfTopics = rosTopics =>
  _.filter(rosTopics, t => _.includes(TF_MESSAGE_TYPES, t.messageType));

export const stopPropagation = e => e.stopPropagation();

export const downloadFile = (content, filename, options = {}) => {
  const element = document.createElement('a');
  element.setAttribute(
    'href',
    `data:${options.mimetype || 'text/json'};charset=utf-8,${encodeURIComponent(
      content,
    )}`,
  );
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const DEFAULT_CONFIG = {
  panels: {
    sidebar: {
      display: true,
    },
    header: {
      display: true,
    },
    info: {
      display: true,
      collapsed: true,
    },
  },
  ros: {
    endpoint: 'ws://localhost:9090',
  },
  infoTabs: [],
  visualizations: [],
  globalOptions: {
    display: true,
    backgroundColor: {
      display: true,
      value: DEFAULT_OPTIONS_SCENE.backgroundColor,
    },
    fixedFrame: {
      display: true,
      value: 'world',
    },
    grid: {
      display: true,
      size: DEFAULT_OPTIONS_SCENE.gridSize,
      divisions: DEFAULT_OPTIONS_SCENE.gridDivisions,
      color: DEFAULT_OPTIONS_SCENE.gridColor,
      centerlineColor: DEFAULT_OPTIONS_SCENE.gridCenterlineColor,
    },
  },
  tools: {
    mode: 'controls',
    controls: {
      display: false,
      enabled: true,
    },
    measure: {
      display: false,
    },
    custom: [],
  },
};

export function updateOptionsUtil(e) {
  const {
    options: { key },
    updateVizOptions,
  } = this.props;
  const {
    checked,
    dataset: { id: optionId },
    value,
  } = e.target;
  updateVizOptions(key, {
    [optionId]: _.has(e.target, 'checked') ? checked : value,
  });
}

export function promisifyGetNodeDetails(ros, node) {
  return new Promise(function(res, rej) {
    try {
      ros.getNodeDetails(node, function({ publishing, subscribing }) {
        console.log;
        res({ publishing, subscribing, node });
      });
    } catch (err) {
      rej(err);
    }
  });
}

/**
 *
 * @param {Array} topics - a list of topics
 * @param {Object} nodeDetails - List of node details with node name, publishing topics and subsribing topics
 * @returns {Array} - List of edges
 */
export function createEdges(topics, nodeDetails) {
  const auxGraphData = {};

  topics.forEach(topic => {
    auxGraphData[topic] = { publishers: [], subscribers: [] };
  });
  nodeDetails.forEach(function({ publishing: pubs, subscribing: subs, node }) {
    pubs.forEach(topic => {
      auxGraphData[topic].publishers.push(node);
    });
    subs.forEach(topic => {
      auxGraphData[topic].subscribers.push(node);
    });
  });

  const edges = [];

  _.each(_.keys(auxGraphData), t => {
    const { publishers } = auxGraphData[t];
    const { subscribers } = auxGraphData[t];

    _.each(publishers, (pub, i1) => {
      _.each(subscribers, (sub, i2) => {
        edges.push({
          id: `${i1}${i2}`,
          source: pub,
          target: sub,
          label: t,
        });
      });
    });
  });
  console.log(edges);
  return edges;
}

/**
 *
 * @param {*} ros - Ros reference
 * @returns {Promise} - graph object represents nodes and links as edges.
 */
export function generateGraph(ros) {
  const graph = {};

  return new Promise(function(res, rej) {
    ros.getNodes(nodes => {
      graph.nodes = _.map(nodes, node => ({ id: node, label: node }));

      ros.getTopics(function({ topics }) {
        Promise.all(
          nodes.map(function(node) {
            return promisifyGetNodeDetails(ros, node);
          }),
        )
          .then(function(data) {
            graph.links = createEdges(topics, data);
            res(graph);
          })
          .catch(function(err) {
            rej(err);
          });
      });
    });
  });
}

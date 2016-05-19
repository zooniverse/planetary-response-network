'use strict';
const panoptesClientFactory = require('../modules/panoptes-client-factory');

class PanoptesProxy {
  constructor() {
    // Autobind middlewares
    this.getProjects = this.getProjects.bind(this);
    this.getSubjectSets = this.getSubjectSets.bind(this);
  }

  getPanoptesCollectionQuery(req) {
    let query = {};
    if (req.query.page) query.page = req.query.page;
    if (req.query.page_size) query.page_size = req.query.page_size;
    if (req.query.sort) query.sort = req.query.sort;
    if (req.query.include) query.include = req.query.include;

    return query;
  }

  getProjects(req, res, next) {
    const client = panoptesClientFactory.getClientForUser(req.user);
    const query = this.getPanoptesCollectionQuery(req);
    query.owner = req.user.get('displayName');

    client.type('projects').get(query).then(
      projects => res.send(projects),
      reason => next(new Error(reason))
    );
  }

  getSubjectSets(req, res, next) {
    const client = panoptesClientFactory.getClientForUser(req.user);
    const query = this.getPanoptesCollectionQuery(req);
    if (req.query.project_id) query.project_id = req.query.project_id;
    if (req.query.workflow_id) query.workflow_id = req.query.workflow_id;

    client.type('subject_sets').get().then(
      projects => res.send(projects),
      reason => next(new Error(reason))
    );
  }
}

module.exports = new PanoptesProxy();
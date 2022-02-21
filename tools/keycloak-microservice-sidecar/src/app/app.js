const ExpressAdapter = require('../web/express-adapter');
const routesV1 = require('../web/routesV1');
const Dependencies = require('../dependencies');

module.exports = class App {
  /**
   * App
   *
   * @param {Config} config Dojot config
   * @param {Logger} logger Dojot logger
   */
  constructor(config, logger) {
    this.logger = logger;
    this.config = config;
  }

  /**
   * Initializes the application
   *
   */
  async init() {
    // Initialize internal dependencies
    const { web, tenantService, stateManager,primaryAppHealthCheck } = Dependencies(
      this.config,
      this.logger,
    );
    this.server = web.httpServer;

    try {
      // The Primary app health-check is done at intervals directly in the Event Loop
      stateManager.addHealthChecker(
        'primatyapp',
        primaryAppHealthCheck.run.bind(primaryAppHealthCheck),
        config.primaryapp.healthcheck.delay,
      );

      const listTenants = await tenantService.updateListTenants();
      // Adapts express to the application and manages the routes
      this.express = ExpressAdapter.xadapt(
        routesV1('/', web.controllers, this.config, web.interceptors),
        listTenants,
        this.server.serviceState,
        this.logger,
        this.config,
      );
      this.server.init(this.express);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
};

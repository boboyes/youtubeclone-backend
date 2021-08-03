/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1626833710716_1324';

  // add your middleware config here
  config.middleware = [
    'errorHandler',
  ];

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  config.mongoose = {
    client: {
      url: 'mongodb://127.0.0.1/youtube-clone',
      options: {
        useUnifiedTopology: true,
      },
      // mongoose global plugins, expected a function or an array of function and options
      plugins: [],
    },
  };

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.validate = {
    // convert: false,
    // validateRoot: false,
  };

  config.jwt = {
    secret: 'f29c30e4-9017-4dd5-a039-4c3b7914c245',
    expiresIn: '1d',
  };

  config.cors = {
    origin: '*',
  };

  return {
    ...config,
    ...userConfig,
  };
};

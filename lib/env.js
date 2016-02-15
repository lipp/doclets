var mongodb_port = 27017
var redis_port = 6379
/* istanbul ignore next */
if (process.env.TRAVIS) {
  module.exports = {
    mongodb: {
      host: 'localhost',
      port: mongodb_port,
      db: '/'
    },
    redis: {
      host: 'localhost',
      port: redis_port
    },
    server: {
      secret: 'your secret passphrase',
      authServer: 'http://127.0.0.1:8080',
      GITHUB_CLIENT_ID: '4a182557b0d459383e55',
      GITHUB_CLIENT_SECRET: '1bc0158227cf2c460a8298816d40c9bd6dc18df7'
    },
    api: {
      secret: '12345678'
    }
  }
} else if (process.env.TEST) {
  module.exports = {
    mongodb: {
      host: '192.168.99.100',
      port: mongodb_port,
      db: '/'
    },
    redis: {
      host: '192.168.99.100',
      port: redis_port
    },
    server: {
      secret: 'your secret passphrase',
      authServer: 'http://127.0.0.1:8080',
      GITHUB_CLIENT_ID: '4a182557b0d459383e55',
      GITHUB_CLIENT_SECRET: '1bc0158227cf2c460a8298816d40c9bd6dc18df7'
    },
    api: {
      secret: '12345678'
    }
  }
} else if (process.env.DEV) {
  module.exports = {
    mongodb: {
      host: '192.168.99.100',
      port: mongodb_port,
      db: '/app'
    },
    redis: {
      host: '192.168.99.100',
      port: redis_port
    },
    server: {
      secret: 'your secret passphrase',
      authServer: 'http://127.0.0.1:8080',
      GITHUB_CLIENT_ID: '4a182557b0d459383e55',
      GITHUB_CLIENT_SECRET: '1bc0158227cf2c460a8298816d40c9bd6dc18df7'
    },
    api: {
      secret: '12345678'
    }
  }
} else {
  module.exports = {
    mongodb: {
      host: 'mongodb',
      port: mongodb_port,
      db: '/app'
    },
    redis: {
      host: 'redis',
      port: redis_port
    },
    server: {
      secret: process.env.SERVER_SECRET,
      authServer: 'https://doclets.io',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET
    },
    api: {
      secret: process.env.API_SECRET
    }
  }
}

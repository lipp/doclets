var mongodb_port = 27017
var redis_port = 6379

if (process.env.TRAVIS) {
  module.exports = {
    mongodb: {
      host: 'localhost',
      port: mongodb_port
    },
    redis: {
      host: 'localhost',
      port: redis_port
    }
  }
} else if (process.env.TEST) {
  module.exports = {
    mongodb: {
      host: '192.168.99.100',
      port: mongodb_port
    },
    redis: {
      host: '192.168.99.100',
      port: redis_port
    }
  }
} else {
  module.exports = {
    mongodb: {
      host: 'mongodb',
      port: mongodb_port
    },
    redis: {
      host: 'redis',
      port: redis_port
    }
  }
}

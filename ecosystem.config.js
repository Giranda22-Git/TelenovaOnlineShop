module.exports = {
  apps : [{
    name: 'telenova-api',
    script: './backEnd/index.js',
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    }
  }]
}
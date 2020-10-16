const fs = require('fs');
const scanner = require('sonarqube-scanner');

const token = fs.readFileSync('./sonarqube/token.txt', 'utf-8'); // Get token from file

scanner(
  {
    token: token,
    options: {
      'sonar.login': token,
      'sonar.projectKey': 'Feed-The-Parrot',
      'sonar.projectDescription': 'RSS Feed Reader for Alexa',
      'sonar.sources': 'src/',
      'sonar.tests': 'tests/',
    },
  },
  () => process.exit()
);

const fs = require('fs');
const scanner = require('sonarqube-scanner');

const token = fs.readFileSync('./sonarqube/token.txt', 'utf-8').trim(); // Get token from file

scanner(
  {
    token: token,
    options: {
      'sonar.login': token,
      'sonar.projectName': 'Feed the Parrot',
      'sonar.sources': 'src/',
      'sonar.tests': 'tests/',
    },
  },
  () => process.exit()
);

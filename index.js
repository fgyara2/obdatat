const
  fs = require('fs'),
  nJwt = require('njwt'),
  qs = require('qs'),
  request = require('axios'),
  chalk = require('chalk')
  boxen = require('boxen');

console.log(chalk.bold.green(boxen("Open Banking Directory Access Token Acquisition Tool", {
  margin: 1,
  padding: 1,
  style: 'double'
})));
console.log();

// Load Private Key and config from files
const signingKey = fs.readFileSync(`${__dirname}/config/privatekey.pem`); // ES512
const config = JSON.parse(fs.readFileSync(`${__dirname}/config/config.json`));

const claims = {
  iss: config.softwareStatementId,
  sub: config.softwareStatementId,
  scope: config.clientScopes,
  aud: config.aud
};

const created_jwt = nJwt.create(claims, signingKey, 'RS256');
created_jwt.setHeader('kid', config.keyId);
const compacted_jwt = created_jwt.compact();

console.log(chalk.bold.blue("Created JWT:"), compacted_jwt);
console.log();

// Configure the request to obtain token
const tokenRequestSpec = {
  url: config.tokenUrl,
  method: 'POST',
  data: qs.stringify({
    'client_assertion_type': 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    'grant_type': 'client_credentials',
    'client_id': config.softwareStatementId,
    'client_assertion': compacted_jwt,
    'scope': config.clientScopes
  })
};

console.log(chalk.bold.blue("Requesting Access Token..."));
console.log(tokenRequestSpec);
console.log();

const errorHandler = function(error) {
  console.log(chalk.red.bold(error));
  console.log(chalk.blue.bold("Response body:"));
  console.log(error.response.data);
};

// Send request to get the token
request(tokenRequestSpec)
  .then((response) => {
    console.log(chalk.bold.blue("Token acquired:"), response.data.access_token);
    console.log();

    // Configure the request for test endpoint - list of TPPs
    const tppRequestSpec = {
      url: config.tppTestUrl,
      method: "GET",
      headers: {
        "Authorization": `Bearer ${response.data.access_token}`
      }
    };

    return request(tppRequestSpec);

  })
  .then((response) => {
    console.log(chalk.bold.blue("TPPs"));

    // Test request to get the list of TPPs
    response.data.Resources.forEach((tpp) => {
      const org = tpp['urn:openbanking:organisation:1.0'];
      console.log("-", org.OrganisationCommonName);
    });

  })
  .catch(errorHandler);

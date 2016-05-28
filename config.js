/* figures out the current environment and appropriate returns host */

console.log('Setting client and server configurations based on environment...');

var DEFAULT_ENV = 'staging';

var	PRN_HOSTS = {
	production:   null, // TBD
	development: 'https://52.38.229.223:3736',
	staging:     'https://localhost:3736' //'https://52.38.229.223:3736',
}

var PRN_CLIENTS = {
	production:   null, // TBD
	development: 'https://52.35.80.72:3443',
	staging:     'https://localhost:3443' //'https://52.35.80.72:3443',
}

var OAUTH_HOSTS = {
  production: 'https://panoptes.zooniverse.org',
  staging: 'https://panoptes-staging.zooniverse.org',
  development: 'https://panoptes-staging.zooniverse.org',
};

// determine environment
var envFromShell = process.env.NODE_ENV;
var env = envFromShell || DEFAULT_ENV;

// set client
var clientFromShell = process.env.PRN_CLIENT;
var client = clientFromShell || PRN_CLIENTS[env];
console.log('USING PRN CLIENT: ', client); // DEBUG CODE

// set host
var hostFromShell = process.env.PRN_HOST;
var host = hostFromShell || PRN_HOSTS[env];
console.log('USING PRN HOST: ', host); // DEBUG CODE

if (!env.match(/^(production|staging|development)$/)) {
  throw new Error('Planetary Response Network (client): Invalid Environment; ' +
    'try setting NODE_ENV to "staging" instead of "'+envFromShell+'".');
}

module.exports = {
  host: host,
	client: client,
  oauthHost: OAUTH_HOSTS[env]
};

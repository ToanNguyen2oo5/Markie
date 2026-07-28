import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8280',
  realm: 'markie',
  clientId: 'markie_webapp',
});

export default keycloak;

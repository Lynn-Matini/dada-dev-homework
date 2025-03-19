const axios = require('axios');
const { Buffer } = require('buffer');

const rpcUser = 'matini';
const rpcPassword = 'lynnpass';
const rpcUrl = 'http://localhost:38332';

// Encode authentication in Base64
const auth = Buffer.from(`${rpcUser}:${rpcPassword}`).toString('base64');
const headers = {
  Authorization: `Basic ${auth}`,
  'Content-Type': 'application/json',
};

// JSON-RPC payload
const payload = {
  jsonrpc: '2.0',
  id: '1',
  method: 'getblockchaininfo',
  params: [],
};

// Send request to Bitcoin Core RPC
axios
  .post(rpcUrl, payload, { headers })
  .then((response) => {
    const data = response.data.result;
    console.log(`Chain: ${data.chain}, Blocks: ${data.blocks}`);
  })
  .catch((error) => {
    console.error(
      'Error:',
      error.response ? error.response.data : error.message
    );
  });

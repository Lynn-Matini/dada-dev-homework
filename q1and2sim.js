const axios = require('axios');

// 🔹 Bitcoin Core RPC Config
const RPC_USER = 'matini';
const RPC_PASS = 'lynnpass';
const RPC_PORT = 38332; // Ensure this matches your Bitcoin Core port for Signet
const RPC_URL = `http://127.0.0.1:${RPC_PORT}`;

async function rpcCall(method, params = []) {
  try {
    const response = await axios.post(
      RPC_URL,
      { jsonrpc: '1.0', id: 'rpc', method, params },
      { auth: { username: RPC_USER, password: RPC_PASS } }
    );
    return response.data.result;
  } catch (error) {
    console.error(
      `RPC Error (${method}):`,
      error.response?.data || error.message
    );
    return null;
  }
}

// ===== EXERCISE 1: P2PKH TRANSACTION =====

// 🔹 Generate a new Bitcoin address
async function generateAddress() {
  const address = await rpcCall('getnewaddress');
  console.log('Generated Bitcoin Address:', address);
  return address;
}

// 🔹 Send funds to an address
async function fundAddress(address) {
  const txid = await rpcCall('sendtoaddress', [address, 0.001]);
  console.log('Transaction ID:', txid);
  return txid;
}

// 🔹 Create & Sign a P2PKH Transaction
async function createAndSignTransaction(txid, recipient) {
  const utxos = await rpcCall('listunspent');
  const utxo = utxos.find((u) => u.txid === txid);

  if (!utxo) {
    console.error('No UTXO found for this transaction ID.');
    return;
  }

  // Create Raw Transaction
  const rawTx = await rpcCall('createrawtransaction', [
    [{ txid: utxo.txid, vout: utxo.vout }],
    { [recipient]: 0.0009 },
  ]);

  // Sign Transaction
  const signedTx = await rpcCall('signrawtransactionwithwallet', [rawTx]);
  console.log('Signed Transaction:', signedTx.hex);

  // Broadcast Transaction
  const txidSent = await rpcCall('sendrawtransaction', [signedTx.hex]);
  console.log('Broadcasted Transaction ID:', txidSent);
}

// ===== EXERCISE 2: 2-of-3 MULTISIG TRANSACTION =====

// 🔹 Generate a 2-of-3 Multisig Address
async function createMultisigAddress() {
  const keys = await Promise.all([
    rpcCall('getnewaddress'),
    rpcCall('getnewaddress'),
    rpcCall('getnewaddress'),
  ]);
  console.log('Generated Public Keys:', keys);

  const multisig = await rpcCall('createmultisig', [2, keys]);
  console.log('Multisig Address:', multisig.address);
  return multisig;
}

// 🔹 Fund the Multisig Address
async function fundMultisig(address) {
  const txid = await rpcCall('sendtoaddress', [address, 0.002]);
  console.log('Multisig Funding TXID:', txid);
  return txid;
}

// 🔹 Spend from the Multisig Address
async function spendFromMultisig(txid, recipient) {
  const utxos = await rpcCall('listunspent');
  const utxo = utxos.find((u) => u.txid === txid);

  if (!utxo) {
    console.error('No UTXO found for this transaction ID.');
    return;
  }

  // Create Raw Transaction
  const rawTx = await rpcCall('createrawtransaction', [
    [{ txid: utxo.txid, vout: utxo.vout }],
    { [recipient]: 0.0018 },
  ]);

  // Sign with 2 keys
  const signedTx = await rpcCall('signrawtransactionwithwallet', [rawTx]);
  console.log('Signed Multisig TX:', signedTx.hex);

  // Broadcast
  const txidSent = await rpcCall('sendrawtransaction', [signedTx.hex]);
  console.log('Broadcasted Multisig TXID:', txidSent);
}

// ===== EXECUTION =====
(async () => {
  // 🔹 P2PKH Test
  const address = await generateAddress();
  const txid = await fundAddress(address);
  await createAndSignTransaction(txid, 'recipient_address_here');

  // 🔹 Multisig Test
  const multisig = await createMultisigAddress();
  const multisigTxid = await fundMultisig(multisig.address);
  await spendFromMultisig(multisigTxid, 'recipient_address_here');
})();

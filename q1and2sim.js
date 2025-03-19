const axios = require('axios');

// Bitcoin Core RPC Config
const RPC_USER = 'matini';
const RPC_PASS = 'lynnpass';
const RPC_PORT = 38332;
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
async function generateAddress() {
  const address = await rpcCall('getnewaddress');
  console.log('Generated Bitcoin Address:', address);
  return address;
}

async function fundAddress(address) {
  const txid = await rpcCall('sendtoaddress', [
    address,
    0.001,
    '',
    '',
    false,
    true,
    0.00005,
  ]);
  console.log('Transaction ID:', txid);
  return txid;
}

async function createAndSignTransaction(txid, recipient) {
  const utxos = await rpcCall('listunspent');
  if (!utxos || utxos.length === 0) {
    console.error('No UTXOs available. Check funding transaction.');
    return;
  }

  const utxo = utxos.find((u) => u.txid === txid);
  if (!utxo) {
    console.error('No matching UTXO found for this transaction ID.');
    return;
  }

  const rawTx = await rpcCall('createrawtransaction', [
    [{ txid: utxo.txid, vout: utxo.vout }],
    { [recipient]: utxo.amount - 0.0001 },
  ]);

  const signedTx = await rpcCall('signrawtransactionwithwallet', [rawTx]);
  console.log('Signed Transaction:', signedTx.hex);

  const txidSent = await rpcCall('sendrawtransaction', [signedTx.hex]);
  console.log('Broadcasted Transaction ID:', txidSent);
}

// ===== EXERCISE 2: 2-of-3 MULTISIG TRANSACTION =====
async function createMultisigAddress() {
  const addresses = await Promise.all([
    rpcCall('getnewaddress'),
    rpcCall('getnewaddress'),
    rpcCall('getnewaddress'),
  ]);

  const pubkeys = await Promise.all(
    addresses.map(async (addr) => {
      const info = await rpcCall('getaddressinfo', [addr]);
      return info.pubkey;
    })
  );

  console.log('Generated Public Keys:', pubkeys);

  const multisig = await rpcCall('createmultisig', [2, pubkeys]);
  console.log('Multisig Address:', multisig.address);
  return multisig;
}

async function fundMultisig(address) {
  const txid = await rpcCall('sendtoaddress', [address, 0.002]);
  console.log('Multisig Funding TXID:', txid);
  return txid;
}

async function getUtxoForAddress(address) {
  const utxos = await rpcCall('listunspent', [1, 9999999, [address]]);
  if (!utxos || utxos.length === 0) {
    console.error(`No UTXO found for address: ${address}`);
    return null;
  }
  return utxos[0];
}

async function spendFromMultisig(multisigAddress, recipient) {
  const utxo = await getUtxoForAddress(multisigAddress);
  if (!utxo) {
    console.error(
      'No UTXO found. Ensure the funding transaction is confirmed.'
    );
    return;
  }

  const rawTx = await rpcCall('createrawtransaction', [
    [{ txid: utxo.txid, vout: utxo.vout }],
    { [recipient]: utxo.amount - 0.0001 },
  ]);

  const signedTx = await rpcCall('signrawtransactionwithwallet', [rawTx]);
  console.log('Signed Multisig TX:', signedTx.hex);

  const txidSent = await rpcCall('sendrawtransaction', [signedTx.hex]);
  console.log('Broadcasted Multisig TXID:', txidSent);
}

// ===== EXECUTION =====
(async () => {
  const address = await generateAddress();
  const txid = await fundAddress(address);
  await createAndSignTransaction(txid, 'recipient_address_here');

  const multisig = await createMultisigAddress();
  const multisigTxid = await fundMultisig(multisig.address);
  await spendFromMultisig(multisig.address, 'recipient_address_here');
})();

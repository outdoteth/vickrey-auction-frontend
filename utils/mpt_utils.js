const ethblock = require("@ethereumjs/block");
// const ethtx = require('@ethereumjs/tx');
const { rlp } = require("ethereumjs-util");
const MPT = require("merkle-patricia-tree");
const { GetProof } = require("eth-proof");
// const { getAccountProof } = require("./scripts/utils");
// const utils = require("./scripts/utils");
const web3 = require("web3");
const ethers = require("ethers");
const fs = require("fs");
import proverAbi from "../contracts/Prover.abi.json";

// const { assert } = require("console");
// const dotenv = ;
require("dotenv").config();
// module.exports = utils;

const Trie = MPT.BaseTrie;

function buffer2hex(buffer) {
  return "0x" + buffer.toString("hex");
}

function getHeader(block) {
  const headerData = {
    number: block.number,
    parentHash: block.parentHash,
    difficulty: parseInt(block.difficulty),
    gasLimit: block.gasLimit,
    timestamp: block.timestamp,
    mixHash: block.mixHash,
    nonce: block.nonce,
    uncleHash: block.sha3Uncles,
    bloom: block.logsBloom,
    transactionsTrie: block.transactionsRoot,
    stateRoot: block.stateRoot,
    receiptTrie: block.receiptsRoot,
    coinbase: block.miner,
    extraData: block.extraData,
    gasUsed: block.gasUsed,
    totalDifficulty: block.totalDifficulty,
    // size: block.size,
  };
  const header = ethblock.BlockHeader.fromHeaderData(headerData);
  // console.log('----', header.toJSON());
  return header;
}

function getReceiptLight(receipt) {
  return {
    status: receipt.status ? 1 : 0,
    gasUsed: receipt.gasUsed,
    logsBloom: receipt.logsBloom,
    logs: receipt.logs,
  };
}

function getReceipt(receipt) {
  // const receiptData = {
  //     transactionHash: receipt.transactionHash,
  //     transactionIndex: receipt.transactionIndex,
  //     blockHash: receipt.blockHash,
  //     blockNumber: receipt.blockNumber,
  //     from: receipt.from,
  //     to: receipt.to,
  //     gasUsed: receipt.gasUsed,
  //     cummulativeGasUsed: receipt.cummulativeGasUsed,
  //     contractAddress: receipt.contractAddress,
  //     // bloom: receipt.logsBloom,
  //     // status: receipt.status,
  //     // v: receipt.v,
  //     // r: receipt.r,
  //     // s: receipt.s,
  //     // logs: receipt.logs,
  // }
  const receiptData = {
    status: receipt.status ? 1 : 0,
    gasUsed: receipt.gasUsed,
    bloom: receipt.logsBloom,
    logs: receipt.logs,
  };
  return receiptData;
}

function getReceiptRlp(receipt) {
  return rlp.encode(Object.values(getReceipt(receipt)));
}

async function getReceiptTrie(receipts) {
  const receiptTrie = new Trie();
  for (let txIdx = 0; txIdx < receipts.length; txIdx++) {
    await receiptTrie.put(rlp.encode(txIdx), getReceiptRlp(receipts[txIdx]));
  }
  return receiptTrie;
}

function hex2key(hexkey, proofLength) {
  const actualkey = [];
  const encoded = buffer2hex(rlp.encode(hexkey)).slice(2);
  let key = [...new Array(encoded.length / 2).keys()].map((i) => parseInt(encoded[i * 2] + encoded[i * 2 + 1], 16));

  key.forEach((val) => {
    if (actualkey.length + 1 === proofLength) {
      actualkey.push(val);
    } else {
      actualkey.push(Math.floor(val / 16));
      actualkey.push(val % 16);
    }
  });
  return "0x" + actualkey.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function index2key(index, proofLength) {
  const actualkey = [];
  const encoded = buffer2hex(rlp.encode(index)).slice(2);
  let key = [...new Array(encoded.length / 2).keys()].map((i) => parseInt(encoded[i * 2] + encoded[i * 2 + 1], 16));

  key.forEach((val) => {
    if (actualkey.length + 1 === proofLength) {
      actualkey.push(val);
    } else {
      actualkey.push(Math.floor(val / 16));
      actualkey.push(val % 16);
    }
  });
  return "0x" + actualkey.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function expandkey(hexvalue) {
  if (hexvalue.substring(0, 2) === "0x") hexvalue = hexvalue.substring(2);
  return [...new Array(hexvalue.length).keys()].map((i) => "0" + hexvalue[i]).join("");
}

async function getTransactionProof(getProof, prover, txhash) {
  if (typeof getProof === "string") getProof = new GetProof(getProof);
  const proof = await _getTransactionProof(getProof, txhash);
  const proofData = proof.proof.map((node) => buffer2hex(rlp.encode(node)));
  const block = await prover.toBlockHeader(proof.headerData);
  return {
    expectedRoot: block.transactionsRoot,
    key: index2key(proof.receiptIndex, proof.proof.length),
    proof: proofData,
    keyIndex: proof.keyIndex,
    proofIndex: proof.proofIndex,
    expectedValue: proof.receiptData,
    header: block,
  };
}

async function getReceiptProof(getProof, prover, txhash) {
  if (typeof getProof === "string") getProof = new GetProof(getProof);
  const proof = await _getReceiptProof(getProof, txhash);
  const proofData = proof.proof.map((node) => buffer2hex(rlp.encode(node)));
  const block = await prover.toBlockHeader(proof.headerData);
  return {
    expectedRoot: block.receiptsRoot,
    key: index2key(proof.receiptIndex, proof.proof.length),
    proof: proofData,
    keyIndex: proof.keyIndex,
    proofIndex: proof.proofIndex,
    expectedValue: proof.receiptData,
    header: block,
  };
}

async function _getTransactionProof(getProof, txhash) {
  const proof = await getProof.transactionProof(txhash);
  const data = [...proof.txProof].map((node) => node.map((elem) => buffer2hex(elem)));
  return {
    receiptIndex: parseInt(proof.txIndex.slice(2), 16),
    keyIndex: 0,
    proofIndex: 0,
    receiptData: data[data.length - 1][1],
    proof: data,
    headerData: proof.header.toHex(),
  };
}

async function _getReceiptProof(getProof, txhash) {
  const proof = await getProof.receiptProof(txhash);
  const receiptProof = [...proof.receiptProof].map((node) => node.map((elem) => buffer2hex(elem)));
  return {
    receiptIndex: parseInt(proof.txIndex.slice(2), 16),
    keyIndex: 0,
    proofIndex: 0,
    receiptData: receiptProof[receiptProof.length - 1][1],
    proof: receiptProof,
    headerData: proof.header.toHex(),
  };
}

async function _getAccountProof(getProof, address, blockHash) {
  const proof = await getProof.accountProof(address, blockHash);
  const accountProof = [...proof.accountProof].map((node) => node.map((elem) => buffer2hex(elem)));

  return {
    keyIndex: 0,
    proofIndex: 0,
    receiptData: accountProof[accountProof.length - 1],
    proof: accountProof,
    headerData: proof.header.toHex(),
  };
}

async function getAccountProof(web3, getProof, prover, address, blockHash) {
  if (typeof getProof === "string") getProof = new GetProof(getProof);
  const proof = await _getAccountProof(getProof, address, blockHash);
  const proofData = proof.proof.map((node) => buffer2hex(rlp.encode(node)));
  const block = await prover.toBlockHeader(proof.headerData);
  return {
    expectedRoot: block.stateRoot,
    key: "0x" + expandkey(web3.utils.soliditySha3(address)),
    proof: proofData,
    keyIndex: proof.keyIndex,
    proofIndex: proof.proofIndex,
    expectedValue: proof.receiptData[1],
    header: block,
  };
}

async function _getStorageProof(getProof, address, storageAddress, blockHash) {
  const proof = await getProof.storageProof(address, storageAddress, blockHash);
  const accountProof = [...proof.accountProof].map((node) => node.map((elem) => buffer2hex(elem)));

  return {
    keyIndex: 0,
    proofIndex: 0,
    receiptData: accountProof[accountProof.length - 1],
    proof: accountProof,
    headerData: proof.header.toHex(),
  };
}

async function getStorageProof(getProof, prover, address, storageAddress, blockHash) {
  if (typeof getProof === "string") getProof = new GetProof(getProof);
  const proof = await _getStorageProof(getProof, address, storageAddress, blockHash);
  const proofData = proof.proof.map((node) => buffer2hex(rlp.encode(node)));
  const block = await prover.toBlockHeader(proof.headerData);
  return {
    expectedRoot: block.stateRoot,
    // key: index2key(web3.utils.soliditySha3(address)),
    key: "0x" + expandkey(storageAddress),
    proof: proofData,
    keyIndex: proof.keyIndex,
    proofIndex: proof.proofIndex,
    expectedValue: proof.receiptData[1],
    header: block,
  };
}

function getKeyFromProof(proof) {
  if (proof.length <= 1) return "";
  const node = proof[proof.length - 1];
  const hash = web3.utils.soliditySha3(node);
  let decodedPrevNode = rlp.decode(proof[proof.length - 2]).map(buffer2hex);
  let index = decodedPrevNode.findIndex((value) => value === hash);
  proof.pop();
  return getKeyFromProof(proof) + index.toString(16).padStart(2, "0");
}

function fullToMin(header) {
  const { hash, parentHash, difficulty, number, gasLimit, gasUsed, timestamp, totalDifficulty } = header;
  return { hash, parentHash, difficulty, number, gasLimit, gasUsed, timestamp, totalDifficulty };
}

async function getAccountProofEthers(accountAddress, blockNumber) {
  const alchemyGoerliKey = process.env.NEXT_PUBLIC_ALCHEMY_ID;
  const alchemyGoerliRpc =
    process.env.NEXT_PUBLIC_CHAIN_ID == 5 ? "https://eth-goerli.g.alchemy.com/v2/" + alchemyGoerliKey : "https://opt-goerli.g.alchemy.com/v2/" + alchemyGoerliKey;
  const goerliProverAddress = process.env.NEXT_PUBLIC_AUCTION_ADDRESS;

  const rpc = alchemyGoerliRpc;
  const provider = new ethers.providers.JsonRpcProvider(rpc);

  const contractInstance = new ethers.Contract(goerliProverAddress, proverAbi.abi, provider);

  const blockHash = (await provider.getBlock(blockNumber)).hash;

  const rpcProof = await provider.send("eth_getProof", [accountAddress, [], "0x" + blockNumber.toString(16)]);

  const fullAccountProof = await getAccountProof(web3, rpc, contractInstance, accountAddress, blockHash);
  const header = JSON.parse(JSON.stringify(fullAccountProof.header)); // Make JS copy hack

  delete fullAccountProof.header;
  const accountState = rlp.decode(fullAccountProof.expectedValue);
  // const returnValue = await contractInstance.verifyAccount(
  return {
    header,
    fullAccountProof,
    state1: buffer2hex(accountState[1]),
    state2: buffer2hex(accountState[2]),
    state3: buffer2hex(accountState[3]),
    accountAddress,
  };
  // );
  console.log(returnValue);
  // expandkey(web3.utils.soliditySha3(address))
  // 0x050308000c070b070a0e08010a05080e0b09080d090c07080d0e040a010f0d070f0d090503050f0c0905030e0d020b0e0600020d0a0a0a04010706070301020a
  // 0x5380c7b7ae81a58eb98d9c78de4a1fd7fd9535fc953ed2be602daaa41767312a
  // Testing in replit: https://replit.com/@AJGupta/WarmheartedUncommonNlp#contract.sol and https://warmhearteduncommonnlp.ajgupta.repl.co/
}

module.exports = {
  // buffer2hex,
  // getHeader,
  // getReceiptLight,
  // getReceipt,
  // getReceiptRlp,
  // getReceiptTrie,
  // hex2key,
  // index2key,
  // expandkey,
  // getReceiptProof,
  // getTransactionProof,
  // getAccountProof,
  // getStorageProof,
  // getKeyFromProof,
  // fullToMin,
  getAccountProofEthers,
};

// ==========================================
// LEDGER SERVICE
// Append / verify hash-chained ledger blocks.
// The chain starts from a fixed anchored
// genesis hash so any tampered block is
// detectable on replay.
// ==========================================

const LedgerRecord = require('../models/LedgerRecord');
const cryptoService = require('./cryptoService');

const GENESIS_ANCHOR =
  process.env.ANCHORED_GENESIS_HASH ||
  'krishibandhu-genesis-2026-01-01-hash-chain-anchor';

const genesisHashFor = (entityType, entityId) =>
  cryptoService.sha256(
    `${GENESIS_ANCHOR}:${entityType}:${entityId}`,
  );

// -------------------------------------------------
// Append a block to the chain
// -------------------------------------------------

const appendLedger = async ({
  entityType,
  entityId,
  action,
  data = {},
  actor = null,
}) => {
  const last = await LedgerRecord.findOne({
    entityType,
    entityId,
  })
    .sort({ blockNumber: -1 })
    .lean();

  const blockNumber = last ? last.blockNumber + 1 : 1;

  const prevHash = last
    ? last.hash
    : genesisHashFor(entityType, entityId);

  const block = {
    blockNumber,
    action,
    data: cryptoService.canonicalize(data || {}),
    createdAt: new Date().toISOString(),
    actor: actor ? String(actor) : null,
  };

  const hash = cryptoService.sha256(
    prevHash + cryptoService.canonicalize(block),
  );

  return LedgerRecord.create({
    entityType,
    entityId,
    action,
    blockNumber,
    prevHash,
    hash,
    data: data || {},
    actor,
    createdAt: new Date(block.createdAt),
  });
};

// -------------------------------------------------
// Replay and verify the chain integrity
// -------------------------------------------------

const verifyChain = async (entityType, entityId) => {
  const records = await LedgerRecord.find({
    entityType,
    entityId,
  })
    .sort({ blockNumber: 1 })
    .lean();

  let prev = genesisHashFor(entityType, entityId);
  const blocks = [];
  let valid = true;

  records.forEach((record) => {
    const block = {
      blockNumber: record.blockNumber,
      action: record.action,
      data: cryptoService.canonicalize(record.data || {}),
      createdAt: new Date(record.createdAt).toISOString(),
      actor: record.actor ? String(record.actor) : null,
    };

    const expected = cryptoService.sha256(
      prev + cryptoService.canonicalize(block),
    );

    const tampered = expected !== record.hash;

    if (tampered) {
      valid = false;
    }

    blocks.push({
      blockNumber: record.blockNumber,
      action: record.action,
      hash: record.hash,
      prevHash: record.prevHash,
      createdAt: record.createdAt,
      actor: record.actor,
      tampered,
    });

    prev = record.hash;
  });

  return {
    entityType,
    entityId,
    valid,
    length: records.length,
    tamperedBlocks: blocks.filter((b) => b.tampered).map((b) => b.blockNumber),
    genesisHash: genesisHashFor(entityType, entityId),
    blocks,
  };
};

// -------------------------------------------------
// Fetch chain (no validation)
// -------------------------------------------------

const getChain = async (entityType, entityId) => {
  const records = await LedgerRecord.find({
    entityType,
    entityId,
  })
    .sort({ blockNumber: 1 })
    .lean();

  return {
    entityType,
    entityId,
    length: records.length,
    blocks: records.map((r) => ({
      blockNumber: r.blockNumber,
      action: r.action,
      hash: r.hash,
      prevHash: r.prevHash,
      createdAt: r.createdAt,
      actor: r.actor,
      data: r.data,
    })),
  };
};

module.exports = {
  appendLedger,
  verifyChain,
  getChain,
  GENESIS_ANCHOR,
};
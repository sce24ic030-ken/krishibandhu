// ==========================================
// TRACE SERVICE
// QR token issue/verify, checkpoint logging,
// trace timelines and offline sync.
// ==========================================

const QRCode = require('qrcode');

const Checkpoint = require('../models/Checkpoint');
const cryptoService = require('./cryptoService');
const ledgerService = require('./ledgerService');

const ENTITY_MAP = {
  crop: { model: 'Crop', qrType: 'lot' },
  saleListing: { model: 'SaleListing', qrType: 'sale' },
  parchi: { model: 'Parchi', qrType: 'parchi' },
  backhaul: { model: 'Backhaul', qrType: 'logistics' },
  storageRequest: { model: 'StorageRequest', qrType: 'coldstorage' },
  bid: { model: 'Bid', qrType: 'match' },
};

// -------------------------------------------------
// Issue a signed QR token + PNG for an entity
// -------------------------------------------------

const issueQrForEntity = async ({ entityType, entityId }) => {
  const token = cryptoService.issueQrToken({
    type: entityType,
    id: entityId,
  });

  const dataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
  });

  return { token, dataUrl, entityType, entityId };
};

// -------------------------------------------------
// Verify a QR token and (optionally) log a scan
// -------------------------------------------------

const verifyQr = async ({ token, scannedBy = null, location = '', notes = '', syncId = null }) => {
  const result = cryptoService.verifyQrToken(token);

  if (!result.valid) {
    return { verified: false, reason: result.reason };
  }

  const { t: entityType, i: entityId } = result.payload;

  if (!ENTITY_MAP[entityType]) {
    return { verified: false, reason: 'UNKNOWN_ENTITY_TYPE' };
  }

  const entityModel = require(`../models/${ENTITY_MAP[entityType].model}`);

  let entity = null;

  try {
    entity = await entityModel.findById(entityId).lean();
  } catch {
    entity = null;
  }

  if (!entity) {
    return { verified: false, reason: 'ENTITY_NOT_FOUND' };
  }

  let checkpoint = null;

  // Log the scan as a trace checkpoint when a user is scanning.
  if (scannedBy && scannedBy._id) {
    const checkpointData = {
      qrType: ENTITY_MAP[entityType].qrType,
      entityType,
      entityId,
      qrToken: token,
      scannedBy: scannedBy._id,
      scannedByName: scannedBy.name || '',
      role: scannedBy.role || '',
      location: location || '',
      notes: notes || '',
    };

    if (syncId) {
      checkpointData.syncId = syncId;
    }

    checkpoint = await Checkpoint.create(checkpointData);

    // Mirror critical scans into the hash chain.
    // Anchor under the entity's own chain key
    // (crop / parchi / saleListing / ...) so the
    // trace timeline can surface + verify them.
    await ledgerService
      .appendLedger({
        entityType,
        entityId,
        action: `checkpoint.${checkpoint.qrType}`,
        data: {
          qrType: checkpoint.qrType,
          entityType,
          entityId,
          location,
          notes,
        },
        actor: scannedBy._id,
      })
      .catch(() => null);
  }

  return {
    verified: true,
    entityType,
    entityId,
    entitySummary: summarizeEntity(entity, entityType),
    checkpoint,
  };
};

// -------------------------------------------------
// Entity summary for the scanner UI
// -------------------------------------------------

const summarizeEntity = (entity, entityType) => {
  if (!entity) {
    return null;
  }

  switch (entityType) {
    case 'crop':
      return {
        name: entity.name,
        variety: entity.variety,
        status: entity.status,
        area: entity.area,
        areaUnit: entity.areaUnit,
      };
    case 'saleListing':
      return {
        crop: entity.cropName || entity.crop,
        quantity: entity.quantity,
        unit: entity.quantityUnit,
        expectedPrice: entity.expectedPrice,
        market: entity.marketName,
      };
    case 'parchi':
      return {
        parchiNumber: entity.parchiNumber,
        crop: entity.cropName || entity.crop,
        status: entity.status,
        paymentStatus: entity.paymentStatus,
        totalAmount: entity.totalAmount || entity.amount,
      };
    case 'backhaul':
      return {
        vehicleNumber: entity.vehicleNumber,
        vehicleType: entity.vehicleType,
        status: entity.status,
      };
    case 'storageRequest':
      return {
        crop: entity.crop,
        quantity: entity.quantity,
        status: entity.status,
      };
    case 'bid':
      return {
        price: entity.bidPrice,
        quantity: entity.quantity,
        status: entity.status,
      };
    default:
      return { id: entity._id };
  }
};

// -------------------------------------------------
// Timeline of checkpoints for an entity
// -------------------------------------------------

const getTimeline = async ({ entityType, entityId }) => {
  const checkpoints = await Checkpoint.find({ entityType, entityId })
    .sort({ createdAt: 1 })
    .lean();

  const ledger = await ledgerService
    .getChain(entityType, entityId)
    .catch(() => ({ length: 0, blocks: [] }));

  const verification = await ledgerService
    .verifyChain(entityType, entityId)
    .catch(() => ({ valid: null, length: 0, tamperedBlocks: [] }));

  return {
    entityType,
    entityId,
    checkpoints: checkpoints.map((c) => ({
      qrType: c.qrType,
      scannedByName: c.scannedByName,
      role: c.role,
      location: c.location,
      notes: c.notes,
      createdAt: c.createdAt,
    })),
    ledger,
    chainValid: verification.valid,
    tamperedBlocks: verification.tamperedBlocks || [],
  };
};

// -------------------------------------------------
// Count of scans the current user performed
// -------------------------------------------------

const getUserScans = async (userId) =>
  Checkpoint.find({ scannedBy: userId }).sort({ createdAt: -1 }).limit(100).lean();

module.exports = {
  issueQrForEntity,
  verifyQr,
  getTimeline,
  getUserScans,
  ENTITY_MAP,
  summarizeEntity,
};
// ==========================================
// AUDIT SERVICE
// Non-blocking audit trail writer for admin
// and sensitive operations.
// ==========================================

const AuditLog = require('../models/AuditLog');

const recordAudit = async ({
  actor = null,
  action,
  targetType = '',
  targetId = '',
  before = null,
  after = null,
  req = null,
}) => {
  try {
    await AuditLog.create({
      actor: actor?._id || null,
      actorName: actor?.name || '',
      actorRole: actor?.role || '',
      action,
      targetType,
      targetId,
      before,
      after,
      ip: req?.ip || '',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
};

const listAudit = async ({ limit = 100, action, targetType } = {}) => {
  const query = {};

  if (action) {
    query.action = action;
  }

  if (targetType) {
    query.targetType = targetType;
  }

  return AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 100)
    .lean();
};

module.exports = { recordAudit, listAudit };
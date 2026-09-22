// ==========================================
// NOTIFICATION SERVICE
// SMS / WhatsApp / IVR / in-app alerts.
// Works in demo mode when no external
// provider is configured (writes the
// notification + logs to console).
// ==========================================

const Notification = require('../models/Notification');

const selectChannel = (type) => {
  if (type === 'sms') {
    const available =
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;

    return available ? 'sms' : 'demo';
  }

  if (type === 'whatsapp') {
    const available =
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM;

    return available ? 'whatsapp' : 'demo';
  }

  if (type === 'ivr') {
    const available =
      process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_ID;

    return available ? 'ivr' : 'demo';
  }

  return 'app';
};

const sendNotification = async ({
  user,
  type = 'inapp',
  title = '',
  body = '',
  meta = {},
}) => {
  try {
    const channel = selectChannel(type);

    const record = await Notification.create({
      user: user?._id || user,
      type,
      channel,
      title,
      body,
      meta,
      deliveredAt: channel === 'demo' ? new Date() : new Date(),
    });

    // Demo providers just log; real providers plug in here.
    if (channel === 'demo') {
      console.log(
        `[Notification:${type}] ${title || '(no title)'} — ${body}`,
      );
    }

    return {
      delivered: true,
      channel,
      id: record._id,
    };
  } catch (error) {
    console.error('Notification send failed:', error.message);

    return {
      delivered: false,
      channel: 'failed',
    };
  }
};

const markRead = async (notificationId, userId) =>
  Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { readAt: new Date() },
    { new: true },
  );

const getUnread = async (userId, limit = 50) =>
  Notification.find({ user: userId, readAt: null })
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 50)
    .lean();

module.exports = {
  sendNotification,
  markRead,
  getUnread,
  selectChannel,
};
const fs = require('fs');

const Parchi = require('../models/Parchi');
const Bid = require('../models/Bid');
const SaleListing = require('../models/SaleListing');
const Transaction = require('../models/Transaction');

const ledgerService = require('../services/ledgerService');
const auditService = require('../services/auditService');

/*
 * ==========================================
 * Generate Parchi Number
 * ==========================================
 */

const generateParchiNumber = async () => {
  const year = new Date().getFullYear();

  const count = await Parchi.countDocuments({
    parchiNumber: {
      $regex: `^KB-${year}-`,
    },
  });

  const sequence = String(
    count + 1,
  ).padStart(6, '0');

  return `KB-${year}-${sequence}`;
};

/*
 * ==========================================
 * Generate Payment Reference
 * ==========================================
 */

const generatePaymentReference = async () => {
  const year = new Date().getFullYear();

  const count = await Parchi.countDocuments({
    paymentReference: {
      $regex: `^KB-PAY-${year}-`,
    },
  });

  const sequence = String(
    count + 1,
  ).padStart(6, '0');

  return `KB-PAY-${year}-${sequence}`;
};

/*
 * ==========================================
 * Create Parchi
 * ==========================================
 */

const createParchi = async (
  req,
  res,
) => {
  try {
    const { bidId } = req.body;

    if (!bidId) {
      return res.status(400).json({
        success: false,
        message: 'Bid ID is required.',
      });
    }

    const bid = await Bid.findById(bidId)
      .populate('saleListing')
      .populate('buyer')
      .populate('crop')
      .populate('market');

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found.',
      });
    }

    if (!bid.crop?.owner) {
      return res.status(400).json({
        success: false,
        message:
          'The crop owner could not be determined.',
      });
    }

    if (
      bid.crop.owner.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You can only generate a Parchi for your own crop bids.',
      });
    }

    if (bid.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message:
          'Parchi can only be generated for an accepted bid.',
      });
    }

    if (!bid.saleListing) {
      return res.status(400).json({
        success: false,
        message:
          'This bid is not linked to a sale listing.',
      });
    }

    const existingParchi =
      await Parchi.findOne({
        bid: bid._id,
      });

    if (existingParchi) {
      return res.status(409).json({
        success: false,
        message:
          'A Parchi has already been generated for this bid.',
        data: existingParchi,
      });
    }

    const saleListing =
      await SaleListing.findById(
        bid.saleListing._id,
      );

    if (!saleListing) {
      return res.status(404).json({
        success: false,
        message:
          'Sale listing not found.',
      });
    }

    const parchiNumber =
      await generateParchiNumber();

    const parchi =
      await Parchi.create({
        parchiNumber,

        bid: bid._id,

        saleListing:
          saleListing._id,

        farmer:
          bid.crop.owner,

        trader:
          bid.buyer._id,

        crop:
          bid.crop._id,

        market:
          bid.market._id,

        quantity:
          bid.quantity,

        unit:
          saleListing.unit,

        pricePerUnit:
          bid.pricePerUnit,

        totalAmount:
          bid.totalAmount,

        status:
          'issued',

        paymentStatus:
          'pending',

        issuedAt:
          new Date(),
      });

    const populatedParchi =
      await Parchi.findById(
        parchi._id,
      )
        .populate('bid')
        .populate('saleListing')
        .populate(
          'farmer',
          'name email phone location',
        )
        .populate(
          'trader',
          'name email phone location',
        )
        .populate('crop')
        .populate('market');

    // Append to the tamper-proof hash chain
    await ledgerService.appendLedger({
      entityType: 'parchi',
      entityId: String(parchi._id),
      action: 'parchi.issued',
      data: {
        parchiNumber,
        bid: String(bid._id),
        farmer: String(bid.crop.owner),
        trader: String(bid.buyer._id),
        quantity: bid.quantity,
        pricePerUnit: bid.pricePerUnit,
        totalAmount: bid.totalAmount,
      },
      actor: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message:
        'Parchi generated successfully.',
      data: populatedParchi,
    });
  } catch (error) {
    console.error(
      'Create Parchi Error:',
      error,
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'A Parchi already exists for this bid.',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Failed to generate Parchi.',
    });
  }
};

/*
 * ==========================================
 * Get Parchis
 * ==========================================
 */

const getParchis = async (
  req,
  res,
) => {
  try {
    const filter = {};

    if (req.user.role === 'farmer') {
      filter.farmer =
        req.user._id;
    } else if (
      req.user.role === 'trader'
    ) {
      filter.trader =
        req.user._id;
    }

    const parchis =
      await Parchi.find(filter)
        .populate(
          'farmer',
          'name email phone location',
        )
        .populate(
          'trader',
          'name email phone location',
        )
        .populate('crop')
        .populate('market')
        .populate('saleListing')
        .populate('transaction')
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: parchis.length,
      data: parchis,
    });
  } catch (error) {
    console.error(
      'Get Parchis Error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch Parchis.',
    });
  }
};

/*
 * ==========================================
 * Get Parchi By ID
 * ==========================================
 */

const getParchiById = async (
  req,
  res,
) => {
  try {
    const parchi =
      await Parchi.findById(
        req.params.id,
      )
        .populate('bid')
        .populate('saleListing')
        .populate(
          'farmer',
          'name email phone location',
        )
        .populate(
          'trader',
          'name email phone location',
        )
        .populate('crop')
        .populate('market')
        .populate('transaction');

    if (!parchi) {
      return res.status(404).json({
        success: false,
        message:
          'Parchi not found.',
      });
    }

    const isAdmin =
      req.user.role === 'admin';

    const isFarmer =
      req.user.role === 'farmer' &&
      parchi.farmer?._id?.toString() ===
        req.user._id.toString();

    const isTrader =
      req.user.role === 'trader' &&
      parchi.trader?._id?.toString() ===
        req.user._id.toString();

    if (
      !isAdmin &&
      !isFarmer &&
      !isTrader
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You are not authorized to view this Parchi.',
      });
    }

    return res.status(200).json({
      success: true,
      data: parchi,
    });
  } catch (error) {
    console.error(
      'Get Parchi Error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch Parchi.',
    });
  }
};

/*
 * ==========================================
 * Update Farmer Bank Details
 * ==========================================
 */

const updateParchiBankDetails = async (
  req,
  res,
) => {
  try {
    const {
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      upiId,
    } = req.body;

    const parchi =
      await Parchi.findById(
        req.params.id,
      );

    if (!parchi) {
      return res.status(404).json({
        success: false,
        message:
          'Parchi not found.',
      });
    }

    if (
      req.user.role !== 'farmer' ||
      parchi.farmer.toString() !==
        req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the farmer associated with this Parchi can update bank details.',
      });
    }

    const hasBankDetails =
      bankName ||
      accountHolderName ||
      accountNumber ||
      ifscCode;

    const hasUpi =
      typeof upiId === 'string' &&
      upiId.trim() !== '';

    if (
      !hasBankDetails &&
      !hasUpi
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Provide bank account details or a UPI ID.',
      });
    }

    if (!parchi.bankDetails) {
      parchi.bankDetails = {};
    }

    if (bankName !== undefined) {
      parchi.bankDetails.bankName =
        bankName.trim();
    }

    if (
      accountHolderName !== undefined
    ) {
      parchi.bankDetails.accountHolderName =
        accountHolderName.trim();
    }

    if (
      accountNumber !== undefined
    ) {
      parchi.bankDetails.accountNumber =
        accountNumber.trim();
    }

    if (ifscCode !== undefined) {
      parchi.bankDetails.ifscCode =
        ifscCode
          .trim()
          .toUpperCase();
    }

    if (upiId !== undefined) {
      parchi.bankDetails.upiId =
        upiId.trim();
    }

    if (
      parchi.paymentStatus ===
      'pending'
    ) {
      parchi.paymentStatus =
        'bank_details_shared';
    }

    await parchi.save();

    // Hash-chain the bank-details sharing
    await ledgerService.appendLedger({
      entityType: 'parchi',
      entityId: String(parchi._id),
      action: 'parchi.bank_details_shared',
      data: {
        paymentStatus: parchi.paymentStatus,
        hasAccount: Boolean(parchi.bankDetails?.accountNumber),
        hasUpi: Boolean(parchi.bankDetails?.upiId),
      },
      actor: req.user._id,
    });

    const populatedParchi =
      await Parchi.findById(
        parchi._id,
      )
        .populate(
          'farmer',
          'name email phone location',
        )
        .populate(
          'trader',
          'name email phone location',
        )
        .populate('crop')
        .populate('market')
        .populate('saleListing');

    return res.status(200).json({
      success: true,
      message:
        'Payment details saved successfully.',
      data: populatedParchi,
    });
  } catch (error) {
    console.error(
      'Update Parchi Bank Details Error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to save payment details.',
    });
  }
};

/*
 * ==========================================
 * Submit Manual Bank Transfer
 * ==========================================
 */

const submitParchiTransfer = async (
  req,
  res,
) => {
  try {
    const {
      amount,
      transferredAt,
      transferReference,
      note,
    } = req.body;

    const parchi =
      await Parchi.findById(
        req.params.id,
      );

    if (!parchi) {
      return res.status(404).json({
        success: false,
        message:
          'Parchi not found.',
      });
    }

    if (
      req.user.role !== 'trader' ||
      parchi.trader.toString() !==
        req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the trader associated with this Parchi can submit the transfer.',
      });
    }

    if (
      ![
        'bank_details_shared',
        'rejected',
      ].includes(
        parchi.paymentStatus,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Farmer payment details must be shared before submitting a transfer.',
      });
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'A valid transfer amount is required.',
      });
    }

    if (
      numericAmount !==
      Number(parchi.totalAmount)
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Transfer amount must match the Parchi total of ₹${parchi.totalAmount}.`,
      });
    }

    if (
      !transferReference ||
      !transferReference.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Transfer reference is required.',
      });
    }

    const paymentReference =
      await generatePaymentReference();

    parchi.transferDetails = {
      amount:
        numericAmount,

      transferredAt:
        transferredAt
          ? new Date(
              transferredAt,
            )
          : new Date(),

      transferReference:
        transferReference.trim(),

      note:
        typeof note === 'string'
          ? note.trim()
          : '',
    };

    parchi.paymentReference =
      paymentReference;

    parchi.paymentStatus =
      'transfer_submitted';

    parchi.status =
      'payment_pending';

    await parchi.save();

    // Hash-chain the trader's transfer declaration
    await ledgerService.appendLedger({
      entityType: 'parchi',
      entityId: String(parchi._id),
      action: 'parchi.transfer_submitted',
      data: {
        amount: numericAmount,
        transferReference: transferReference.trim(),
        paymentReference,
      },
      actor: req.user._id,
    });

    const populatedParchi =
      await Parchi.findById(
        parchi._id,
      )
        .populate(
          'farmer',
          'name email phone location',
        )
        .populate(
          'trader',
          'name email phone location',
        )
        .populate('crop')
        .populate('market')
        .populate('saleListing');

    return res.status(200).json({
      success: true,
      message:
        'Transfer details submitted successfully. Upload the transfer receipt for verification.',
      data: populatedParchi,
    });
  } catch (error) {
    console.error(
      'Submit Parchi Transfer Error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to submit transfer details.',
    });
  }
};

/*
 * ==========================================
 * Upload Parchi Receipt
 * ==========================================
 *
 * The current routes use the dedicated
 * parchiReceiptController for receipt upload.
 *
 * This function is retained here for
 * compatibility with existing imports.
 */

const uploadParchiReceipt = async (
  req,
  res,
) => {
  try {
    const parchi =
      await Parchi.findById(
        req.params.id,
      );

    if (!parchi) {
      return res.status(404).json({
        success: false,
        message:
          'Parchi not found.',
      });
    }

    if (
      req.user.role !== 'trader' ||
      parchi.trader.toString() !==
        req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the trader associated with this Parchi can upload the receipt.',
      });
    }

    if (
      parchi.paymentStatus !==
      'transfer_submitted'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Transfer details must be submitted before uploading the receipt.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          'Please upload a payment transfer receipt.',
      });
    }

    parchi.paymentReceipt = {
      fileName:
        req.file.originalname,

      fileUrl:
        `/uploads/parchi-receipts/${req.file.filename}`,

      uploadedAt:
        new Date(),

      uploadedBy:
        req.user._id,

      aiVerification: {
        status:
          'not_checked',

        extractedAmount:
          null,

        extractedDate:
          null,

        extractedReference:
          null,

        notes:
          'Receipt uploaded successfully. AI verification has not been performed yet.',

        checkedAt:
          null,
      },
    };

    parchi.paymentStatus =
      'verification_pending';

    parchi.status =
      'payment_pending';

    await parchi.save();

    // Hash-chain the receipt upload
    await ledgerService.appendLedger({
      entityType: 'parchi',
      entityId: String(parchi._id),
      action: 'parchi.receipt_uploaded',
      data: {
        fileName: req.file.originalname,
        fileUrl: `/uploads/parchi-receipts/${req.file.filename}`,
        aiVerificationStatus: 'not_checked',
      },
      actor: req.user._id,
    });

    const populatedParchi =
      await Parchi.findById(
        parchi._id,
      )
        .populate(
          'farmer',
          'name email phone location',
        )
        .populate(
          'trader',
          'name email phone location',
        )
        .populate('crop')
        .populate('market')
        .populate('saleListing');

    return res.status(200).json({
      success: true,
      message:
        'Transfer receipt uploaded successfully. Payment is now awaiting verification.',
      data: populatedParchi,
    });
  } catch (error) {
    console.error(
      'Upload Parchi Receipt Error:',
      error,
    );

    if (req.file?.path) {
      try {
        if (
          fs.existsSync(
            req.file.path,
          )
        ) {
          fs.unlinkSync(
            req.file.path,
          );
        }
      } catch (fileError) {
        console.error(
          'Receipt Cleanup Error:',
          fileError,
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        'Failed to upload transfer receipt.',
    });
  }
};

/*
 * ==========================================
 * Farmer Final Payment Confirmation
 * ==========================================
 *
 * FINAL FLOW:
 *
 * Trader Transfer
 *       ↓
 * Receipt Upload
 *       ↓
 * AI Verification
 *       ↓
 * Farmer Confirmation
 *       ↓
 * Passbook Transaction
 *       ↓
 * Sale Listing Sold
 *       ↓
 * Parchi Completed
 *
 * IMPORTANT:
 * This is a manual/demo payment workflow.
 * No real bank/payment gateway is used.
 *
 * AI verification only checks receipt
 * information for consistency.
 */

const confirmParchiPayment = async (
  req,
  res,
) => {
  try {
    const {
      confirmation,
      note,
    } = req.body;

    /*
     * ==========================================
     * Validate Confirmation
     * ==========================================
     */

    if (
      ![
        'confirmed',
        'rejected',
      ].includes(confirmation)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Confirmation must be either confirmed or rejected.',
      });
    }

    /*
     * ==========================================
     * Find Parchi
     * ==========================================
     */

    const parchi =
      await Parchi.findById(
        req.params.id,
      );

    if (!parchi) {
      return res.status(404).json({
        success: false,
        message:
          'Parchi not found.',
      });
    }

    /*
     * ==========================================
     * Verify Farmer Ownership
     * ==========================================
     */

    if (
      req.user.role !== 'farmer' ||
      parchi.farmer.toString() !==
        req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the farmer associated with this Parchi can confirm the payment.',
      });
    }

    /*
     * ==========================================
     * Payment Must Be Awaiting Confirmation
     * ==========================================
     */

    if (
      parchi.paymentStatus !==
      'verification_pending'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This Parchi is not waiting for farmer payment confirmation.',
        data: {
          paymentStatus:
            parchi.paymentStatus,

          farmerConfirmation:
            parchi
              .farmerConfirmation
              ?.status ||
            'pending',
        },
      });
    }

    /*
     * ==========================================
     * Receipt Verification
     * ==========================================
     */

    if (
      !parchi.paymentReceipt ||
      !parchi.paymentReceipt
        .aiVerification
    ) {
      return res.status(400).json({
        success: false,
        message:
          'A payment receipt must be uploaded and verified before farmer confirmation.',
      });
    }

    const verificationStatus =
      parchi.paymentReceipt
        .aiVerification
        .status;

    if (
      verificationStatus !==
      'matched'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'The payment receipt has not passed AI verification. Farmer confirmation is not available yet.',
        data: {
          verificationStatus,
        },
      });
    }

    /*
     * ==========================================
     * Farmer Rejects Payment
     * ==========================================
     */

    if (
      confirmation ===
      'rejected'
    ) {
      parchi.farmerConfirmation = {
        status:
          'rejected',

        confirmedAt:
          new Date(),

        confirmedBy:
          req.user._id,

        note:
          typeof note === 'string'
            ? note.trim()
            : '',
      };

      parchi.paymentStatus =
        'rejected';

      parchi.status =
        'payment_pending';

      await parchi.save();

      // Hash-chain the farmer's rejection
      await ledgerService.appendLedger({
        entityType: 'parchi',
        entityId: String(parchi._id),
        action: 'parchi.payment_rejected',
        data: {
          note:
            typeof note === 'string'
              ? note.trim()
              : '',
        },
        actor: req.user._id,
      });

      return res.status(200).json({
        success: true,
        message:
          'Payment rejected by the farmer. The trader can review and resubmit the transfer.',
        data: parchi,
      });
    }

    /*
     * ==========================================
     * Prevent Duplicate Confirmation
     * ==========================================
     */

    if (
      parchi
        .farmerConfirmation
        ?.status ===
      'confirmed'
    ) {
      return res.status(409).json({
        success: false,
        message:
          'This Parchi payment has already been confirmed.',
        data: {
          transactionId:
            parchi.transaction ||
            null,
        },
      });
    }

    /*
     * ==========================================
     * Prevent Duplicate Passbook Transaction
     * ==========================================
     */

    if (parchi.transaction) {
      return res.status(409).json({
        success: false,
        message:
          'A Passbook transaction already exists for this Parchi.',
        data: {
          transactionId:
            parchi.transaction,
        },
      });
    }

    /*
     * ==========================================
     * Validate Payment Amount
     * ==========================================
     */

    const transactionAmount =
      Number(
        parchi.totalAmount,
      );

    if (
      !Number.isFinite(
        transactionAmount,
      ) ||
      transactionAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid Parchi payment amount.',
      });
    }

    /*
     * ==========================================
     * Transaction Date
     * ==========================================
     */

    const transactionDate =
      parchi.transferDetails
        ?.transferredAt
        ? new Date(
            parchi
              .transferDetails
              .transferredAt,
          )
        : new Date();

    if (
      Number.isNaN(
        transactionDate.getTime(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid transfer date.',
      });
    }

    /*
     * ==========================================
     * Create Passbook Transaction
     * ==========================================
     *
     * This is only an internal Passbook
     * record. It does not represent an actual
     * bank transaction performed by KrishiBandhu.
     */

    const transaction =
      await Transaction.create({
        type:
          'income',

        category:
          'Crop Sale',

        description:
          `Crop sale payment received for Parchi ${parchi.parchiNumber}. Payment Reference: ${
            parchi.paymentReference ||
            'N/A'
          }.`,

        amount:
          transactionAmount,

        crop:
          parchi.crop ||
          null,

        market:
          parchi.market ||
          null,

        transactionDate,
      });

    /*
     * ==========================================
     * Update Parchi
     * ==========================================
     */

    const now =
      new Date();

    parchi.farmerConfirmation = {
      status:
        'confirmed',

      confirmedAt:
        now,

      confirmedBy:
        req.user._id,

      note:
        typeof note === 'string'
          ? note.trim()
          : '',
    };

    parchi.paymentStatus =
      'success';

    parchi.status =
      'completed';

    parchi.paidAt =
      now;

    parchi.completedAt =
      now;

    parchi.transaction =
      transaction._id;

    await parchi.save();

    // Hash-chain the settlement confirmation —
    // this is the trusted "payment received" event.
    await ledgerService.appendLedger({
      entityType: 'parchi',
      entityId: String(parchi._id),
      action: 'parchi.payment_confirmed',
      data: {
        paymentStatus: 'success',
        totalAmount: transactionAmount,
        paymentReference: parchi.paymentReference || '',
        transactionId: String(transaction._id),
      },
      actor: req.user._id,
    });

    /*
     * ==========================================
     * Mark Sale Listing Sold
     * ==========================================
     */

    if (
      parchi.saleListing
    ) {
      await SaleListing.findByIdAndUpdate(
        parchi.saleListing,
        {
          status:
            'sold',
        },
      );
    }

    /*
     * ==========================================
     * Get Final Parchi
     * ==========================================
     */

    const populatedParchi =
      await Parchi.findById(
        parchi._id,
      )
        .populate(
          'farmer',
          'name email phone location',
        )
        .populate(
          'trader',
          'name email phone location',
        )
        .populate('crop')
        .populate('market')
        .populate(
          'saleListing',
        )
        .populate(
          'transaction',
        );

    /*
     * ==========================================
     * Final Success
     * ==========================================
     */

    return res.status(200).json({
      success: true,

      message:
        'Payment confirmed successfully. Passbook transaction created and sale completed.',

      data:
        populatedParchi,
    });
  } catch (error) {
    /*
     * ==========================================
     * Error Logging
     * ==========================================
     */

    console.error(
      'Confirm Parchi Payment Error:',
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        'Failed to confirm Parchi payment.',

      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  }
};

/*
 * ==========================================
 * Legacy/Admin Payment Status
 * ==========================================
 *
 * Kept temporarily for compatibility.
 *
 * The intended final workflow is:
 *
 * Trader Transfer
 *       ↓
 * Receipt Upload
 *       ↓
 * AI Verification
 *       ↓
 * Farmer Confirmation
 *       ↓
 * Payment Success
 */

const updateParchiPaymentStatus = async (
  req,
  res,
) => {
  try {
    const {
      paymentStatus,
      paymentReference,
    } = req.body;

    const allowedStatuses = [
      'pending',
      'initiated',
      'bank_details_shared',
      'transfer_submitted',
      'verification_pending',
      'success',
      'rejected',
      'failed',
      'cancelled',
    ];

    if (
      !allowedStatuses.includes(
        paymentStatus,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid payment status.',
      });
    }

    const parchi =
      await Parchi.findById(
        req.params.id,
      );

    if (!parchi) {
      return res.status(404).json({
        success: false,
        message:
          'Parchi not found.',
      });
    }

    parchi.paymentStatus =
      paymentStatus;

    if (
      paymentReference !==
      undefined
    ) {
      parchi.paymentReference =
        paymentReference;
    }

    if (
      paymentStatus ===
      'success'
    ) {
      parchi.paidAt =
        new Date();

      parchi.status =
        'paid';
    }

    if (
      paymentStatus ===
        'failed' ||
      paymentStatus ===
        'rejected'
    ) {
      parchi.status =
        'payment_pending';
    }

    await parchi.save();

    // Hash-chain the admin adjustment
    await ledgerService.appendLedger({
      entityType: 'parchi',
      entityId: String(parchi._id),
      action: 'parchi.payment_admin_adjusted',
      data: {
        paymentStatus,
        paymentReference:
          parchi.paymentReference || null,
      },
      actor: req.user._id,
    });

    await auditService.recordAudit({
      actor: req.user,
      action: 'parchi.payment_status.updated',
      targetType: 'parchi',
      targetId: String(parchi._id),
      after: { paymentStatus },
      req,
    });

    return res.status(200).json({
      success: true,

      message:
        'Parchi payment status updated.',

      data:
        parchi,
    });
  } catch (error) {
    console.error(
      'Update Parchi Payment Status Error:',
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        'Failed to update payment status.',
    });
  }
};

/*
 * ==========================================
 * Exports
 * ==========================================
 */

module.exports = {
  createParchi,
  getParchis,
  getParchiById,
  updateParchiBankDetails,
  submitParchiTransfer,
  uploadParchiReceipt,
  confirmParchiPayment,
  updateParchiPaymentStatus,
};
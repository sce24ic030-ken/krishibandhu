const Bid = require('../models/Bid');
const Crop = require('../models/Crop');
const Market = require('../models/Market');
const SaleListing = require('../models/SaleListing');

/*
 * GET ALL BIDS
 *
 * Farmer:
 *   sees bids on their own crops
 *
 * Trader:
 *   sees their own bids
 *
 * Admin:
 *   sees all bids
 */
const getBids = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'admin') {
      filter = {};
    } else if (req.user.role === 'trader') {
      filter = {
        buyer: req.user._id,
      };
    } else if (req.user.role === 'farmer') {
      const farmerCrops = await Crop.find({
        owner: req.user._id,
      }).select('_id');

      const cropIds = farmerCrops.map(
        (crop) => crop._id,
      );

      filter = {
        crop: { $in: cropIds },
      };
    }

    const bids = await Bid.find(filter)
      .populate('saleListing')
      .populate('buyer', 'name email phone role location isVerified')
      .populate('crop')
      .populate('market')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bids.length,
      data: bids,
    });
  } catch (error) {
    console.error('Get bids error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch bids.',
    });
  }
};


/*
 * GET SINGLE BID
 */
const getBidById = async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id)
      .populate('saleListing')
      .populate(
        'buyer',
        'name email phone role location isVerified',
      )
      .populate('crop')
      .populate('market');

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found.',
      });
    }

    /*
     * Authorization check
     */
    if (req.user.role === 'trader') {
      if (
        !bid.buyer ||
        bid.buyer._id.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own bids.',
        });
      }
    }

    if (req.user.role === 'farmer') {
      if (
        !bid.crop ||
        bid.crop.owner?.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You can only view bids for your own crops.',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: bid,
    });
  } catch (error) {
    console.error('Get bid error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch bid.',
    });
  }
};


/*
 * CREATE BID
 *
 * New marketplace flow:
 *
 * Trader
 *   ↓
 * Sale Listing
 *   ↓
 * Bid
 *
 * The trader identity comes from JWT.
 * Crop and market come from the Sale Listing.
 */
const createBid = async (req, res) => {
  try {
    /*
     * Only traders can create bids.
     */
    if (req.user.role !== 'trader') {
      return res.status(403).json({
        success: false,
        message: 'Only traders can place bids.',
      });
    }

    const {
      saleListing,
      quantity,
      pricePerUnit,
      message,
    } = req.body;

    /*
     * Required fields
     */
    if (
      !saleListing ||
      quantity === undefined ||
      pricePerUnit === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Sale listing, quantity and price are required.',
      });
    }

    /*
     * Validate numeric values
     */
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(pricePerUnit);

    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0.',
      });
    }

    if (
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Price per unit cannot be negative.',
      });
    }

    /*
     * Find the Sale Listing
     */
    const listing = await SaleListing.findById(
      saleListing,
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Sale listing not found.',
      });
    }

    /*
     * Only active listings can receive bids.
     */
    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message:
          'This sale listing is no longer active.',
      });
    }

    /*
     * Check expiration if one exists.
     */
    if (
      listing.expiresAt &&
      new Date(listing.expiresAt) < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This sale listing has expired.',
      });
    }

    /*
     * Quantity cannot exceed the listed quantity.
     */
    if (parsedQuantity > listing.quantity) {
      return res.status(400).json({
        success: false,
        message:
          `Bid quantity cannot exceed the listed quantity of ${listing.quantity} ${listing.unit}.`,
      });
    }

    /*
     * Prevent the farmer from bidding on their
     * own listing in case roles/data are ever changed.
     */
    if (
      listing.farmer.toString() ===
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You cannot place a bid on your own crop listing.',
      });
    }

    /*
     * Load crop and market from the listing.
     */
    const cropExists = await Crop.findById(
      listing.crop,
    );

    if (!cropExists) {
      return res.status(404).json({
        success: false,
        message:
          'The crop associated with this listing was not found.',
      });
    }

    const marketExists = await Market.findById(
      listing.market,
    );

    if (!marketExists) {
      return res.status(404).json({
        success: false,
        message:
          'The market associated with this listing was not found.',
      });
    }

    /*
     * Prevent duplicate active/pending bids from
     * the same trader on the same listing.
     */
    const existingBid = await Bid.findOne({
      saleListing: listing._id,
      buyer: req.user._id,
      status: {
        $in: ['pending', 'accepted'],
      },
    });

    if (existingBid) {
      return res.status(409).json({
        success: false,
        message:
          'You already have an active bid for this listing.',
      });
    }

    /*
     * Calculate total amount.
     */
    const totalAmount = Number(
      (
        parsedQuantity *
        parsedPrice
      ).toFixed(2),
    );

    /*
     * Create bid.
     *
     * buyerName and buyerContact are taken from
     * the authenticated user.
     */
    const bid = await Bid.create({
      saleListing: listing._id,

      buyer: req.user._id,

      crop: listing.crop,

      market: listing.market,

      buyerName: req.user.name,

      buyerContact: req.user.phone,

      quantity: parsedQuantity,

      pricePerUnit: parsedPrice,

      totalAmount,

      message: message
        ? message.trim()
        : '',

      status: 'pending',
    });

    /*
     * Populate the newly created bid.
     */
    const populatedBid = await Bid.findById(
      bid._id,
    )
      .populate('saleListing')
      .populate(
        'buyer',
        'name email phone role location isVerified',
      )
      .populate('crop')
      .populate('market');

    res.status(201).json({
      success: true,
      message: 'Bid created successfully.',
      data: populatedBid,
    });
  } catch (error) {
    console.error('Create bid error:', error);

    res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to create bid.',
    });
  }
};


/*
 * UPDATE BID STATUS
 *
 * Farmer:
 *   can accept/reject bids for their own crops
 *
 * Admin:
 *   can manage any bid
 */
const updateBidStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (
      ![
        'pending',
        'accepted',
        'rejected',
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Status must be pending, accepted, or rejected.',
      });
    }

    const bid = await Bid.findById(
      req.params.id,
    ).populate('crop');

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found.',
      });
    }

    /*
     * Admin can update any bid.
     */
    if (req.user.role === 'admin') {
      bid.status = status;

      await bid.save();
    }

    /*
     * Farmer can update bids only for their
     * own crops.
     */
    else if (req.user.role === 'farmer') {
      if (
        !bid.crop ||
        bid.crop.owner?.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You can only manage bids for your own crops.',
        });
      }

      bid.status = status;

      await bid.save();
    }

    /*
     * Traders cannot accept/reject their own bids.
     */
    else {
      return res.status(403).json({
        success: false,
        message:
          'Traders cannot change bid status.',
      });
    }

    const updatedBid = await Bid.findById(
      bid._id,
    )
      .populate('saleListing')
      .populate(
        'buyer',
        'name email phone role location isVerified',
      )
      .populate('crop')
      .populate('market');

    res.status(200).json({
      success: true,
      message:
        `Bid ${status} successfully.`,
      data: updatedBid,
    });
  } catch (error) {
    console.error(
      'Update bid status error:',
      error,
    );

    res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to update bid status.',
    });
  }
};


/*
 * DELETE BID
 *
 * Trader can delete their own bid.
 * Admin can delete any bid.
 */
const deleteBid = async (req, res) => {
  try {
    const bid = await Bid.findById(
      req.params.id,
    );

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found.',
      });
    }

    if (req.user.role === 'admin') {
      // Admin can delete any bid.
    } else if (req.user.role === 'trader') {
      if (
        !bid.buyer ||
        bid.buyer.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You can only delete your own bids.',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message:
          'You are not allowed to delete bids.',
      });
    }

    await Bid.findByIdAndDelete(
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: 'Bid deleted successfully.',
    });
  } catch (error) {
    console.error(
      'Delete bid error:',
      error,
    );

    res.status(500).json({
      success: false,
      message:
        'Failed to delete bid.',
    });
  }
};


module.exports = {
  getBids,
  getBidById,
  createBid,
  updateBidStatus,
  deleteBid,
};
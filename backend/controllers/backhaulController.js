const Backhaul = require('../models/Backhaul');
const Market = require('../models/Market');

/* =========================================================
   HELPERS
========================================================= */

const populateBackhaul = (
  query,
) => {
  return query
    .populate(
      'farmer',
      'name email phone role location',
    )
    .populate(
      'trader',
      'name email phone role location isVerified',
    )
    .populate(
      'sourceMarket',
      'name district state type location',
    )
    .populate(
      'destinationMarket',
      'name district state type location',
    )
    .populate(
      'saleListing',
      'quantity unit askingPrice status',
    )
    .populate(
      'parchi',
      'parchiNumber totalAmount status',
    );
};

/* =========================================================
   UNIT CONVERSION
   Everything is internally converted to KG.
========================================================= */

const convertToKg = (
  quantity,
  unit,
) => {
  const value =
    Number(quantity);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return null;
  }

  switch (unit) {
    case 'kg':
      return value;

    case 'quintal':
      return value * 100;

    case 'ton':
      return value * 1000;

    default:
      return null;
  }
};

const convertFromKg = (
  quantityKg,
  unit,
) => {
  const value =
    Number(quantityKg);

  if (
    !Number.isFinite(value)
  ) {
    return null;
  }

  switch (unit) {
    case 'kg':
      return value;

    case 'quintal':
      return value / 100;

    case 'ton':
      return value / 1000;

    default:
      return null;
  }
};

/* =========================================================
   GET AVAILABLE TRADER TRANSPORT
========================================================= */

const getAvailableBackhaul =
  async (
    req,
    res,
  ) => {
    try {
      const {
        sourceMarket,
        destinationMarket,
        departureDate,
        minCapacity,
        search,
      } = req.query;

      const filter = {
        transportType:
          'trader',

        status:
          'available',

        availableCapacity: {
          $gt: 0,
        },
      };

      if (sourceMarket) {
        filter.sourceMarket =
          sourceMarket;
      }

      if (destinationMarket) {
        filter.destinationMarket =
          destinationMarket;
      }

      if (departureDate) {
        const start =
          new Date(
            departureDate,
          );

        if (
          !Number.isNaN(
            start.getTime(),
          )
        ) {
          const end =
            new Date(start);

          end.setDate(
            end.getDate() + 1,
          );

          filter.departureDate = {
            $gte: start,
            $lt: end,
          };
        }
      }

      if (minCapacity) {
        const capacity =
          Number(
            minCapacity,
          );

        if (
          Number.isFinite(
            capacity,
          ) &&
          capacity > 0
        ) {
          filter.availableCapacity = {
            $gte: capacity,
          };
        }
      }

      /* -----------------------------------------
         Search
      ----------------------------------------- */

      if (search) {
        const markets =
          await Market.find({
            $or: [
              {
                name: {
                  $regex:
                    search,
                  $options:
                    'i',
                },
              },
              {
                district: {
                  $regex:
                    search,
                  $options:
                    'i',
                },
              },
            ],
          }).select(
            '_id',
          );

        const marketIds =
          markets.map(
            (market) =>
              market._id,
          );

        const searchConditions =
          [
            {
              vehicleNumber: {
                $regex:
                  search,
                $options:
                  'i',
              },
            },
            {
              vehicleType: {
                $regex:
                  search,
                $options:
                  'i',
              },
            },
          ];

        if (
          marketIds.length >
          0
        ) {
          searchConditions.push(
            {
              sourceMarket: {
                $in: marketIds,
              },
            },
            {
              destinationMarket:
                {
                  $in: marketIds,
                },
            },
          );
        }

        filter.$or =
          searchConditions;
      }

      const backhauls =
        await populateBackhaul(
          Backhaul.find(
            filter,
          ),
        ).sort({
          departureDate: 1,
          estimatedCost: 1,
          createdAt: -1,
        });

      return res
        .status(200)
        .json({
          success: true,
          count:
            backhauls.length,
          data: backhauls,
        });
    } catch (error) {
      console.error(
        'Get available backhaul error:',
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Failed to fetch available transport.',
        });
    }
  };

/* =========================================================
   GET MY BACKHAUL RECORDS
========================================================= */

const getMyBackhaul =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req.user._id;

      const filter =
        req.user.role ===
        'trader'
          ? {
              trader:
                userId,
            }
          : {
              farmer:
                userId,
            };

      const backhauls =
        await populateBackhaul(
          Backhaul.find(
            filter,
          ),
        ).sort({
          createdAt: -1,
        });

      return res
        .status(200)
        .json({
          success: true,
          count:
            backhauls.length,
          data: backhauls,
        });
    } catch (error) {
      console.error(
        'Get my backhaul error:',
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Failed to fetch your transport records.',
        });
    }
  };

/* =========================================================
   GET ALL BACKHAUL (ADMIN)
========================================================= */

const getAllBackhaul =
  async (
    req,
    res,
  ) => {
    try {
      const backhauls =
        await populateBackhaul(
          Backhaul.find({}),
        ).sort({
          createdAt: -1,
        });

      return res
        .status(200)
        .json({
          success: true,
          count:
            backhauls.length,
          data: backhauls,
        });
    } catch (error) {
      console.error(
        'Get all backhaul error:',
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Failed to fetch transport records.',
        });
    }
  };

/* =========================================================
   CREATE BACKHAUL
========================================================= */

const createBackhaul =
  async (
    req,
    res,
  ) => {
    try {
      const {
        sourceMarket,
        destinationMarket,
        transportType,
        vehicleNumber,
        vehicleType,
        driverName,
        driverPhone,
        capacity,
        capacityUnit,
        availableCapacity,
        departureDate,
        departureTime,
        estimatedDistanceKm,
        estimatedCost,
        costUnit,
        notes,
        saleListing,
        parchi,
      } = req.body;

      /* -----------------------------------------
         Basic validation
      ----------------------------------------- */

      if (
        !sourceMarket ||
        !destinationMarket
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Source and destination markets are required.',
          });
      }

      if (
        String(
          sourceMarket,
        ) ===
        String(
          destinationMarket,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Source and destination markets must be different.',
          });
      }

      if (
        !transportType ||
        ![
          'own',
          'trader',
        ].includes(
          transportType,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'A valid transport type is required.',
          });
      }

      /* -----------------------------------------
         Role validation
      ----------------------------------------- */

      if (
        transportType ===
          'own' &&
        req.user.role !==
          'farmer'
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'Only farmers can create own transport records.',
          });
      }

      if (
        transportType ===
          'trader' &&
        req.user.role !==
          'trader'
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'Only traders can publish trader transport.',
          });
      }

      /* -----------------------------------------
         Capacity
      ----------------------------------------- */

      const numericCapacity =
        Number(capacity);

      const numericAvailableCapacity =
        availableCapacity ===
          undefined ||
        availableCapacity ===
          null ||
        availableCapacity ===
          ''
          ? numericCapacity
          : Number(
              availableCapacity,
            );

      if (
        !Number.isFinite(
          numericCapacity,
        ) ||
        numericCapacity <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Capacity must be greater than zero.',
          });
      }

      if (
        ![
          'kg',
          'quintal',
          'ton',
        ].includes(
          capacityUnit ||
            'ton',
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Invalid capacity unit.',
          });
      }

      if (
        !Number.isFinite(
          numericAvailableCapacity,
        ) ||
        numericAvailableCapacity <
          0 ||
        numericAvailableCapacity >
          numericCapacity
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Available capacity must be between zero and total capacity.',
          });
      }

      /* -----------------------------------------
         Cost
      ----------------------------------------- */

      const numericCost =
        Number(
          estimatedCost,
        );

      if (
        !Number.isFinite(
          numericCost,
        ) ||
        numericCost < 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Transport cost must be a valid non-negative amount.',
          });
      }

      /* -----------------------------------------
         Departure
      ----------------------------------------- */

      if (!departureDate) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'A valid departure date is required.',
          });
      }

      const departure =
        new Date(
          departureDate,
        );

      if (
        Number.isNaN(
          departure.getTime(),
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'A valid departure date is required.',
          });
      }

      /* -----------------------------------------
         Markets
      ----------------------------------------- */

      const source =
        await Market.findById(
          sourceMarket,
        ).select(
          '_id name district state',
        );

      if (!source) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Source market not found.',
          });
      }

      const destination =
        await Market.findById(
          destinationMarket,
        ).select(
          '_id name district state',
        );

      if (!destination) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Destination market not found.',
          });
      }

      /* -----------------------------------------
         Create
      ----------------------------------------- */

      const payload = {
        farmer:
          transportType ===
          'own'
            ? req.user._id
            : null,

        trader:
          transportType ===
          'trader'
            ? req.user._id
            : null,

        saleListing:
          saleListing ||
          null,

        parchi:
          parchi || null,

        sourceMarket,

        destinationMarket,

        transportType,

        vehicleNumber:
          vehicleNumber ||
          undefined,

        vehicleType:
          vehicleType ||
          undefined,

        driverName:
          driverName ||
          undefined,

        driverPhone:
          driverPhone ||
          undefined,

        capacity:
          numericCapacity,

        capacityUnit:
          capacityUnit ||
          'ton',

        availableCapacity:
          numericAvailableCapacity,

        allocatedQuantity:
          0,

        allocatedQuantityUnit:
          'kg',

        farmerTransportCost:
          0,

        departureDate:
          departure,

        departureTime:
          departureTime ||
          undefined,

        estimatedDistanceKm:
          estimatedDistanceKm ===
            undefined ||
          estimatedDistanceKm ===
            null ||
          estimatedDistanceKm ===
            ''
            ? null
            : Number(
                estimatedDistanceKm,
              ),

        estimatedCost:
          numericCost,

        costUnit:
          costUnit ||
          'total',

        notes:
          notes ||
          undefined,

        status:
          transportType ===
          'trader'
            ? 'available'
            : 'selected',
      };

      const backhaul =
        await Backhaul.create(
          payload,
        );

      const populated =
        await populateBackhaul(
          Backhaul.findById(
            backhaul._id,
          ),
        );

      return res
        .status(201)
        .json({
          success: true,
          message:
            transportType ===
            'trader'
              ? 'Trader transport published successfully.'
              : 'Own transport selected successfully.',
          data:
            populated,
        });
    } catch (error) {
      console.error(
        'Create backhaul error:',
        error,
      );

      if (
        error.name ===
        'ValidationError'
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Invalid backhaul details.',
            errors:
              Object.values(
                error.errors,
              ).map(
                (item) =>
                  item.message,
              ),
          });
      }

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Failed to create transport record.',
        });
    }
  };

/* =========================================================
   SELECT TRADER TRANSPORT
========================================================= */

const selectTraderTransport =
  async (
    req,
    res,
  ) => {
    try {
      if (
        req.user.role !==
        'farmer'
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'Only farmers can select trader transport.',
          });
      }

      const {
        quantity,
        quantityUnit =
          'kg',
      } = req.body;

      const requestedKg =
        convertToKg(
          quantity,
          quantityUnit,
        );

      if (
        requestedKg ===
          null ||
        requestedKg <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Please provide a valid transport quantity greater than zero.',
          });
      }

      const backhaul =
        await Backhaul.findById(
          req.params.id,
        );

      if (!backhaul) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Transport option not found.',
          });
      }

      if (
        backhaul.transportType !==
        'trader'
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'This is not a trader transport option.',
          });
      }

      if (
        backhaul.status !==
        'available'
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              'This transport is no longer available.',
          });
      }

      const availableKg =
        convertToKg(
          backhaul.availableCapacity,
          backhaul.capacityUnit,
        );

      const totalCapacityKg =
        convertToKg(
          backhaul.capacity,
          backhaul.capacityUnit,
        );

      if (
        availableKg ===
          null ||
        totalCapacityKg ===
          null
      ) {
        return res
          .status(500)
          .json({
            success: false,
            message:
              'Unable to calculate transport capacity.',
          });
      }

      if (
        requestedKg >
        availableKg
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              `Requested quantity exceeds available capacity. Available: ${availableKg} kg.`,
            availableCapacityKg:
              availableKg,
          });
      }

      /* -----------------------------------------
         Cost calculation
         Proportional to truck capacity
      ----------------------------------------- */

      let totalTransportCost =
        Number(
          backhaul.estimatedCost,
        );

      if (
        backhaul.costUnit ===
        'per_kg'
      ) {
        totalTransportCost =
          requestedKg *
          Number(
            backhaul.estimatedCost,
          );
      } else if (
        backhaul.costUnit ===
        'per_quintal'
      ) {
        totalTransportCost =
          (requestedKg /
            100) *
          Number(
            backhaul.estimatedCost,
          );
      } else if (
        backhaul.costUnit ===
        'per_ton'
      ) {
        totalTransportCost =
          (requestedKg /
            1000) *
          Number(
            backhaul.estimatedCost,
          );
      } else {
        /*
          Total truck cost.
          Farmer pays proportional share
          based on allocated quantity.
        */

        totalTransportCost =
          Number(
            backhaul.estimatedCost,
          ) *
          (requestedKg /
            totalCapacityKg);
      }

      totalTransportCost =
        Math.round(
          totalTransportCost *
            100,
        ) / 100;

      const remainingKg =
        availableKg -
        requestedKg;

      const remainingCapacity =
        convertFromKg(
          remainingKg,
          backhaul.capacityUnit,
        );

      /* -----------------------------------------
         Assign farmer
      ----------------------------------------- */

      backhaul.farmer =
        req.user._id;

      backhaul.allocatedQuantity =
        requestedKg;

      backhaul.allocatedQuantityUnit =
        'kg';

      backhaul.farmerTransportCost =
        totalTransportCost;

      backhaul.availableCapacity =
        remainingCapacity;

      backhaul.status =
        'selected';

      backhaul.selectedAt =
        new Date();

      await backhaul.save();

      const populated =
        await populateBackhaul(
          Backhaul.findById(
            backhaul._id,
          ),
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            'Trader transport selected successfully.',

          allocation: {
            requestedQuantity:
              requestedKg,

            requestedQuantityUnit:
              'kg',

            remainingCapacity:
              remainingCapacity,

            remainingCapacityUnit:
              backhaul.capacityUnit,

            farmerTransportCost:
              totalTransportCost,
          },

          data:
            populated,
        });
    } catch (error) {
      console.error(
        'Select trader transport error:',
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Failed to select trader transport.',
        });
    }
  };

/* =========================================================
   UPDATE BACKHAUL STATUS
========================================================= */

const updateBackhaulStatus =
  async (
    req,
    res,
  ) => {
    try {
      const {
        status,
      } = req.body;

      const allowedStatuses =
        [
          'available',
          'selected',
          'confirmed',
          'completed',
          'cancelled',
        ];

      if (
        !allowedStatuses.includes(
          status,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Invalid transport status.',
          });
      }

      const backhaul =
        await Backhaul.findById(
          req.params.id,
        );

      if (!backhaul) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Transport record not found.',
          });
      }

      const isAdmin =
        req.user.role ===
        'admin';

      const isTraderOwner =
        req.user.role ===
          'trader' &&
        backhaul.trader &&
        String(
          backhaul.trader,
        ) ===
          String(
            req.user._id,
          );

      const isFarmerOwner =
        req.user.role ===
          'farmer' &&
        backhaul.farmer &&
        String(
          backhaul.farmer,
        ) ===
          String(
            req.user._id,
          );

      if (
        !isAdmin &&
        !isTraderOwner &&
        !isFarmerOwner
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'You are not allowed to update this transport.',
          });
      }

      backhaul.status =
        status;

      if (
        status ===
        'confirmed'
      ) {
        backhaul.confirmedAt =
          new Date();
      }

      if (
        status ===
        'completed'
      ) {
        backhaul.completedAt =
          new Date();
      }

      if (
        status ===
        'cancelled'
      ) {
        backhaul.cancelledAt =
          new Date();
      }

      await backhaul.save();

      const populated =
        await populateBackhaul(
          Backhaul.findById(
            backhaul._id,
          ),
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            'Transport status updated successfully.',
          data:
            populated,
        });
    } catch (error) {
      console.error(
        'Update backhaul status error:',
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Failed to update transport status.',
        });
    }
  };

/* =========================================================
   CANCEL BACKHAUL
========================================================= */

const cancelBackhaul =
  async (
    req,
    res,
  ) => {
    try {
      const backhaul =
        await Backhaul.findById(
          req.params.id,
        );

      if (!backhaul) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Transport record not found.',
          });
      }

      const isAdmin =
        req.user.role ===
        'admin';

      const isTraderOwner =
        req.user.role ===
          'trader' &&
        backhaul.trader &&
        String(
          backhaul.trader,
        ) ===
          String(
            req.user._id,
          );

      const isFarmerOwner =
        req.user.role ===
          'farmer' &&
        backhaul.farmer &&
        String(
          backhaul.farmer,
        ) ===
          String(
            req.user._id,
          );

      if (
        !isAdmin &&
        !isTraderOwner &&
        !isFarmerOwner
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'You are not allowed to cancel this transport.',
          });
      }

      if (
        backhaul.status ===
        'completed'
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Completed transport cannot be cancelled.',
          });
      }

      backhaul.status =
        'cancelled';

      backhaul.cancelledAt =
        new Date();

      await backhaul.save();

      return res
        .status(200)
        .json({
          success: true,
          message:
            'Transport cancelled successfully.',
        });
    } catch (error) {
      console.error(
        'Cancel backhaul error:',
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Failed to cancel transport.',
        });
    }
  };

module.exports = {
  getAvailableBackhaul,
  getMyBackhaul,
  getAllBackhaul,
  createBackhaul,
  selectTraderTransport,
  updateBackhaulStatus,
  cancelBackhaul,
};
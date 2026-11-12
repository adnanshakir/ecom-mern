import mongoose from "mongoose";
import CustomerProfile from "../../models/customer/customer.model.js";
import Cart from "../../models/customer/cart.model.js";
import Wishlist from "../../models/customer/wishlist.model.js";
import ApiError from "../../utils/apiError.js";
import { verifyOTP } from "../../config/otpHelper.js";
import { config } from "../../config/config.js";

const getCustomerUserFilter = (authUserId) => {
  const filters = [{ id: authUserId }, { _id: authUserId }];
  if (mongoose.Types.ObjectId.isValid(authUserId)) {
    filters.push({ _id: new mongoose.Types.ObjectId(authUserId) });
  }
  return { $or: filters };
};

/**
 * Delete the authenticated customer's account after phone OTP verification.
 */
export const deleteMyAccount = async (req, res, next) => {
  try {
    const authUserId = req.customer?.id;
    const phoneNumber = req.customer?.phoneNumber;

    if (!authUserId || !phoneNumber) {
      throw new ApiError(401, "Unauthorized: Invalid customer session");
    }

    const isValidOtp = await verifyOTP({
      phoneNumber,
      code: req.body.otp,
    });

    if (!isValidOtp) {
      throw new ApiError(401, "Incorrect or expired verification code");
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw new ApiError(500, "Database connection unavailable");
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const profile = await CustomerProfile.findOne({ authUserId }).session(session);
      await Cart.deleteMany(profile ? { customer: profile._id } : { customer: null }, { session });
      await Wishlist.deleteMany(profile ? { customer: profile._id } : { customer: null }, {
        session,
      });
      await CustomerProfile.deleteOne({ authUserId }, { session });

      // TODO: anonymize personal fields and detach the customer when an Order model is introduced.
      await db.collection("customerSession").deleteMany({ userId: authUserId }, { session });
      await db.collection("customerAccount").deleteMany({ userId: authUserId }, { session });
      await db.collection("customerVerification").deleteMany(
        {
          identifier: {
            $in: [phoneNumber, req.customer.email].filter(Boolean),
          },
        },
        { session }
      );

      const deletedUser = await db
        .collection("customerUser")
        .deleteOne(getCustomerUserFilter(authUserId), { session });

      if (deletedUser.deletedCount === 0) {
        throw new ApiError(404, "Customer not found");
      }

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }

    const cookieOptions = config.cookieOptions;
    res.clearCookie("better-auth.session_token", cookieOptions);
    res.clearCookie("__Secure-better-auth.session_token", cookieOptions);
    res.clearCookie("better-auth.session_data", cookieOptions);
    res.clearCookie("__Secure-better-auth.session_data", cookieOptions);

    res.status(200).json({ success: true, message: "Account deleted" });
  } catch (err) {
    next(err);
  }
};

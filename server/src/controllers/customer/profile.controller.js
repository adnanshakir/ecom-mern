import mongoose from "mongoose";
import CustomerProfile from "../../models/customer/customer.model.js";
import ApiError from "../../utils/apiError.js";

/**
 * Helper to look up a customerUser document by id, _id (string), or _id (ObjectId)
 */
async function findCustomerUserDoc(db, authUserId) {
  const orConditions = [{ id: authUserId }, { _id: authUserId }];
  if (mongoose.Types.ObjectId.isValid(authUserId)) {
    orConditions.push({ _id: new mongoose.Types.ObjectId(authUserId) });
  }
  return await db.collection("customerUser").findOne({ $or: orConditions });
}

/**
 * Get current customer profile details (merging Better Auth user data and Mongoose addresses)
 */
export const getCustomerProfile = async (req, res, next) => {
  try {
    const authUserId = req.customer?.id;
    if (!authUserId) {
      throw new ApiError(401, "Unauthorized: Invalid customer session");
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw new ApiError(500, "Database connection unavailable");
    }

    let userDoc = await findCustomerUserDoc(db, authUserId);
    const profileDoc = await CustomerProfile.findOne({ authUserId });

    const responseData = {
      id: authUserId,
      phoneNumber: userDoc?.phoneNumber || req.customer?.phoneNumber || "",
      name: userDoc?.name || req.customer?.name || "",
      email: userDoc?.email || req.customer?.email || "",
      addresses: profileDoc?.addresses || [],
      createdAt: userDoc?.createdAt || req.customer?.createdAt,
      updatedAt: userDoc?.updatedAt || req.customer?.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Customer profile retrieved successfully",
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update customer profile details (name, email, address) in a single request.
 * Direct update for name and email without requiring OTP.
 */
export const updateCustomerProfile = async (req, res, next) => {
  try {
    const authUserId = req.customer?.id;
    if (!authUserId) {
      throw new ApiError(401, "Unauthorized: Invalid customer session");
    }

    const { name, email, address, addresses } = req.body;
    const db = mongoose.connection.db;

    if (!db) {
      throw new ApiError(500, "Database connection unavailable");
    }

    const updatesToUser = {};

    // Validate and handle name update
    if (name !== undefined) {
      if (typeof name !== "string") {
        throw new ApiError(400, "Invalid name format");
      }
      updatesToUser.name = name.trim();
    }

    // Validate and handle email update (direct update without OTP)
    if (email !== undefined) {
      if (typeof email !== "string") {
        throw new ApiError(400, "Invalid email format");
      }
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new ApiError(400, "Please enter a valid email address");
      }

      // Check if email is already taken by another user
      if (trimmedEmail) {
        const notMeConditions = [{ id: { $ne: authUserId } }, { _id: { $ne: authUserId } }];
        if (mongoose.Types.ObjectId.isValid(authUserId)) {
          notMeConditions.push({ _id: { $ne: new mongoose.Types.ObjectId(authUserId) } });
        }
        const existingWithEmail = await db.collection("customerUser").findOne({
          email: trimmedEmail,
          $and: notMeConditions,
        });

        if (existingWithEmail) {
          throw new ApiError(400, "This email address is already associated with another account");
        }
      }

      updatesToUser.email = trimmedEmail;
    }

    // Perform user update in customerUser collection if there are user fields to update
    if (Object.keys(updatesToUser).length > 0) {
      updatesToUser.updatedAt = new Date();
      const orConditions = [{ id: authUserId }, { _id: authUserId }];
      if (mongoose.Types.ObjectId.isValid(authUserId)) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(authUserId) });
      }
      await db.collection("customerUser").updateOne(
        { $or: orConditions },
        { $set: updatesToUser }
      );
    }

    // Handle Address updates in CustomerProfile
    let profileDoc = await CustomerProfile.findOne({ authUserId });
    if (!profileDoc) {
      profileDoc = new CustomerProfile({ authUserId, addresses: [] });
    }

    if (Array.isArray(addresses)) {
      // Direct replace of addresses array
      profileDoc.addresses = addresses.map((addr) => ({
        label: addr.label || "Home",
        line1: (addr.line1 || "").trim(),
        line2: (addr.line2 || "").trim(),
        city: (addr.city || "").trim(),
        state: (addr.state || "").trim(),
        postalCode: (addr.postalCode || "").trim(),
        country: addr.country || "India",
        phone: addr.phone || "",
        isDefault: Boolean(addr.isDefault),
      }));
      await profileDoc.save();
    } else if (address && typeof address === "object") {
      // Single address passed - update or append primary address
      const formattedAddress = {
        label: address.label || "Home",
        line1: (address.line1 || "").trim(),
        line2: (address.line2 || "").trim(),
        city: (address.city || "").trim(),
        state: (address.state || "").trim(),
        postalCode: (address.postalCode || "").trim(),
        country: address.country || "India",
        phone: address.phone || "",
        isDefault: true,
      };

      if (!profileDoc.addresses || profileDoc.addresses.length === 0) {
        profileDoc.addresses = [formattedAddress];
      } else {
        // Replace primary address or set first element
        profileDoc.addresses[0] = formattedAddress;
      }
      await profileDoc.save();
    }

    // Fetch updated user document
    const updatedUserDoc = await findCustomerUserDoc(db, authUserId);

    const responseData = {
      id: authUserId,
      phoneNumber: updatedUserDoc?.phoneNumber || req.customer?.phoneNumber || "",
      name: updatedUserDoc?.name || updatesToUser.name || req.customer?.name || "",
      email: updatedUserDoc?.email || updatesToUser.email || req.customer?.email || "",
      addresses: profileDoc.addresses || [],
      createdAt: updatedUserDoc?.createdAt || req.customer?.createdAt,
      updatedAt: updatedUserDoc?.updatedAt || req.customer?.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Customer profile updated successfully",
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

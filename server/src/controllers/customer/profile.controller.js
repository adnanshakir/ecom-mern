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

const normalizeAddress = (address, existingAddresses = []) => {
  const existingAddress = address._id ? existingAddresses.id(address._id) : null;
  return {
    ...(existingAddress ? { _id: existingAddress._id } : {}),
    label: typeof address.label === "string" ? address.label.trim() || "Home" : "Home",
    line1: typeof address.line1 === "string" ? address.line1.trim() : "",
    line2: typeof address.line2 === "string" ? address.line2.trim() : "",
    city: typeof address.city === "string" ? address.city.trim() : "",
    state: typeof address.state === "string" ? address.state.trim() : "",
    postalCode: typeof address.postalCode === "string" ? address.postalCode.trim() : "",
    country: typeof address.country === "string" ? address.country.trim() || "India" : "India",
    phone: typeof address.phone === "string" ? address.phone.trim() : "",
    isDefault: Boolean(address.isDefault),
  };
};

const addressKey = (address) =>
  [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
    address.phone,
  ]
    .map((value) => value.trim().toLowerCase())
    .join("|");

const deduplicateAddresses = (addresses, existingAddresses) => {
  const seen = new Set();
  let defaultAssigned = false;

  return addresses.reduce((uniqueAddresses, address) => {
    const normalizedAddress = normalizeAddress(address, existingAddresses);
    if (!normalizedAddress.line1 || !normalizedAddress.city || !normalizedAddress.postalCode) {
      throw new ApiError(400, "Each address requires line1, city, and postalCode");
    }

    const key = addressKey(normalizedAddress);
    if (seen.has(key)) return uniqueAddresses;
    seen.add(key);

    const isDefault = normalizedAddress.isDefault && !defaultAssigned;
    defaultAssigned = defaultAssigned || isDefault;
    uniqueAddresses.push({ ...normalizedAddress, isDefault });
    return uniqueAddresses;
  }, []);
};

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
      phoneNumber: userDoc?.phoneNumber ?? req.customer?.phoneNumber ?? "",
      name: userDoc?.name ?? req.customer?.name ?? "",
      email: userDoc?.email ?? req.customer?.email ?? "",
      addresses: profileDoc?.addresses || [],
      addressesVersion: profileDoc?.__v ?? 0,
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
 * Update customer profile details (name, address) in a single request.
 * Changing email requires verified email-change flow via OTP.
 */
export const updateCustomerProfile = async (req, res, next) => {
  try {
    const authUserId = req.customer?.id;
    if (!authUserId) {
      throw new ApiError(401, "Unauthorized: Invalid customer session");
    }

    const { name, email, address, addresses, addressesVersion } = req.body;
    const db = mongoose.connection.db;

    if (!db) {
      throw new ApiError(500, "Database connection unavailable");
    }

    // Require verified email-change flow for changing email
    if (email !== undefined) {
      throw new ApiError(400, "Email updates require the verified email-change flow");
    }

    const updatesToUser = {};

    // Validate and handle name update
    if (name !== undefined) {
      if (typeof name !== "string") {
        throw new ApiError(400, "Invalid name format");
      }
      updatesToUser.name = name.trim();
    }

    const previousUserDoc = await findCustomerUserDoc(db, authUserId);

    let session = null;
    let inTransaction = false;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      inTransaction = true;
    } catch {
      session = null;
      inTransaction = false;
    }

    let profileDoc;

    try {
      // Perform user update in customerUser collection if there are user fields to update
      if (Object.keys(updatesToUser).length > 0) {
        updatesToUser.updatedAt = new Date();
        const orConditions = [{ id: authUserId }, { _id: authUserId }];
        if (mongoose.Types.ObjectId.isValid(authUserId)) {
          orConditions.push({ _id: new mongoose.Types.ObjectId(authUserId) });
        }
        await db
          .collection("customerUser")
          .updateOne(
            { $or: orConditions },
            { $set: updatesToUser },
            inTransaction && session ? { session } : {}
          );
      }

      // Handle Address updates in CustomerProfile
      const profileQuery =
        Array.isArray(addresses) && Number.isInteger(addressesVersion)
          ? { authUserId, __v: addressesVersion }
          : { authUserId };
      profileDoc = await CustomerProfile.findOne(profileQuery).session(
        inTransaction && session ? session : null
      );
      if (Array.isArray(addresses) && !Number.isInteger(addressesVersion)) {
        throw new ApiError(400, "Address version is required for address updates");
      }
      if (Array.isArray(addresses) && !profileDoc && addressesVersion !== 0) {
        throw new ApiError(409, "Saved addresses changed. Refresh and try again.");
      }
      if (!profileDoc) {
        profileDoc = new CustomerProfile({ authUserId, addresses: [] });
      }

      if (Array.isArray(addresses)) {
        profileDoc.addresses = deduplicateAddresses(addresses, profileDoc.addresses);
        await profileDoc.save(inTransaction && session ? { session } : {});
      } else if (address && typeof address === "object") {
        // Single address passed - update or append primary address
        const formattedAddress = normalizeAddress(
          { ...address, isDefault: true },
          profileDoc.addresses
        );

        if (!profileDoc.addresses || profileDoc.addresses.length === 0) {
          profileDoc.addresses = [formattedAddress];
        } else if (address._id && profileDoc.addresses.id(address._id)) {
          profileDoc.addresses.id(address._id).set(formattedAddress);
        } else {
          // Replace primary address or set first element
          profileDoc.addresses[0] = formattedAddress;
        }
        profileDoc.addresses = deduplicateAddresses(profileDoc.addresses, profileDoc.addresses);
        await profileDoc.save(inTransaction && session ? { session } : {});
      }

      if (inTransaction && session) {
        await session.commitTransaction();
      }
    } catch (writeErr) {
      if (inTransaction && session) {
        await session.abortTransaction();
      } else if (Object.keys(updatesToUser).length > 0 && previousUserDoc) {
        // Fallback manual rollback for customerUser updates when MongoDB transactions are unavailable
        const rollbackFields = {};
        if (updatesToUser.name !== undefined) rollbackFields.name = previousUserDoc.name ?? "";
        if (updatesToUser.email !== undefined) rollbackFields.email = previousUserDoc.email ?? "";
        if (updatesToUser.updatedAt !== undefined)
          rollbackFields.updatedAt = previousUserDoc.updatedAt;

        const orConditions = [{ id: authUserId }, { _id: authUserId }];
        if (mongoose.Types.ObjectId.isValid(authUserId)) {
          orConditions.push({ _id: new mongoose.Types.ObjectId(authUserId) });
        }
        await db
          .collection("customerUser")
          .updateOne({ $or: orConditions }, { $set: rollbackFields });
      }
      throw writeErr;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    // Fetch updated user document
    const updatedUserDoc = await findCustomerUserDoc(db, authUserId);

    const responseData = {
      id: authUserId,
      phoneNumber: updatedUserDoc?.phoneNumber ?? req.customer?.phoneNumber ?? "",
      name: updatedUserDoc?.name ?? updatesToUser.name ?? req.customer?.name ?? "",
      email: updatedUserDoc?.email ?? req.customer?.email ?? "",
      addresses: profileDoc?.addresses || [],
      addressesVersion: profileDoc?.__v ?? 0,
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

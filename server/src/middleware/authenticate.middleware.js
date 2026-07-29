import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import ApiError from "../utils/apiError.utils.js";

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "No token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret.secret);

    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ApiError(401, "Access token expired"));
    }
    if (err.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Invalid token"));
    }
    next(err);
  }
};
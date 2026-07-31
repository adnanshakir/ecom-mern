import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/config.js";

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    config.jwtSecret.secret,
    { expiresIn: config.jwtSecret.accessExpiry }
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};
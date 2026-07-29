import express from "express";
import { register, login, logout, refresh } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validations/auth.validation.js";

const router = express.Router();

router.post("/register", authenticate, authorize("super_admin"), validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);

export default router;
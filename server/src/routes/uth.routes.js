import express from "express";
import { register, login, logout, refresh } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.post("/register", authenticate, authorize("super_admin"), register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);

export default router;
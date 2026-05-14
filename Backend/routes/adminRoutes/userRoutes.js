const express = require("express");
const userController = require("../../controllers/adminControllers/userController");
const { protectAdmin } = require("../../middleware/auth");

const router = express.Router();

router.use(protectAdmin);

router.get("/", userController.listUsers);
router.get("/:id", userController.getUserById);
router.patch("/:id", userController.updateUser);

module.exports = router;

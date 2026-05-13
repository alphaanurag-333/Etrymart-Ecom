const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const attributeController = require("../../controllers/adminControllers/attributeController");

const router = express.Router();

router.use(protectAdmin);

/** Attribute titles (e.g. "Color", "Size") */
router.get("/titles", attributeController.listAttributeTitles);
router.post("/titles", attributeController.createAttributeTitle);
router.get("/titles/:id", attributeController.getAttributeTitleById);
router.patch("/titles/:id", attributeController.updateAttributeTitle);
router.delete("/titles/:id", attributeController.deleteAttributeTitle);

/** Attribute values (per title, e.g. "Red", "M") */
router.get("/values", attributeController.listAttributeValues);
router.post("/values", attributeController.createAttributeValue);
router.get("/values/:id", attributeController.getAttributeValueById);
router.patch("/values/:id", attributeController.updateAttributeValue);
router.delete("/values/:id", attributeController.deleteAttributeValue);

module.exports = router;

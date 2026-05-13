const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { optionalSubCategoryFile } = require("../../middleware/authMultipart");
const subcategoryController = require("../../controllers/adminControllers/subcategoryController");

const router = express.Router();

router.use(protectAdmin);

router.get("/", subcategoryController.listSubCategories);
router.get("/:id", subcategoryController.getSubCategoryById);
router.post("/", optionalSubCategoryFile, subcategoryController.createSubCategory);
router.patch("/:id", optionalSubCategoryFile, subcategoryController.updateSubCategory);
router.delete("/:id", subcategoryController.deleteSubCategory);

module.exports = router;

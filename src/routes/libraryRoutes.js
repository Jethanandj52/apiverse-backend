const express = require("express");
const { createLibrary, updateLibrary, getLibraries } = require("../controllers/libraryControllers");
const router = express.Router();

router.post("/", createLibrary);
router.put("/:id", updateLibrary);
router.get("/", getLibraries);

module.exports = router;

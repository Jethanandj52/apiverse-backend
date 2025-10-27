const express = require("express");
const {
  createApi,
  updateApi,
  deleteApi,
  getApis,
} = require("../controllers/apiControllers");

const router = express.Router();

router.post("/", createApi);
router.put("/:id", updateApi);
router.delete("/:id", deleteApi);
router.get("/", getApis);

module.exports = router;

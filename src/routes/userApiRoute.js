// routes/userApi.js
const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const csv = require("csvtojson");
const crypto = require("crypto");
const { userAuth } = require("../middleware/Auth");
const UserApi = require("../models/userApi");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 🔧 Helper: slug generator
function makeSlug(name) {
  const base = name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const rand = crypto.randomBytes(3).toString("hex");
  return `${base || "api"}-${rand}`;
}

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE USER API                                                         */
/* -------------------------------------------------------------------------- */
// ...existing imports and setup same as before

router.post("/create", userAuth, upload.single("file"), async (req, res) => {
  try {
    const { name, description, category, version, parameters, endpoints, visibility } = req.body;

    if (!name) return res.status(400).json({ message: "API name is required" });

    let parsedData = [];
    let fileType = "none";

    if (req.file) {
      const fileName = req.file.originalname.toLowerCase();
      if (fileName.endsWith(".csv")) {
        parsedData = await csv().fromString(req.file.buffer.toString());
        fileType = "csv";
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedData = xlsx.utils.sheet_to_json(sheet);
        fileType = "excel";
      } else if (fileName.endsWith(".json")) {
        parsedData = JSON.parse(req.file.buffer.toString());
        fileType = "json";
      } else {
        return res.status(400).json({ message: "Unsupported file format (allowed: csv, xlsx, xls, json)" });
      }
    } else if (req.body.data) {
      try {
        parsedData = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
        fileType = "json";
      } catch (e) {
        return res.status(400).json({ message: "Invalid JSON in data field" });
      }
    }

    const safeParameters = typeof parameters === "string" ? parameters : JSON.stringify(parameters || {});
    const safeEndpoints = typeof endpoints === "string" ? endpoints : JSON.stringify(endpoints || []);

    const slug = makeSlug(name);
    const url = `${req.protocol}://${req.get("host")}/userapi/serve/${slug}`;

    // ✅ Auto-generate example code (JavaScript)
    const exampleCode = `// Example: Fetch data from your custom API
fetch("${url}")
  .then(response => response.json())
  .then(data => console.log("Fetched data:", data))
  .catch(error => console.error("Error:", error));`;

    const newApi = new UserApi({
      user: req.user._id,
      name,
      description: description || "",
      category: category || "General",
      version: version || "v1",
      parameters: safeParameters,
      endpoints: safeEndpoints,
      data: parsedData,
      visibility: visibility === "private" ? "private" : "public",
      fileType,
      slug,
      url,
      exampleCode, // ✅ added
    });

    await newApi.save();

    return res.status(201).json({
      message: "✅ User API created successfully",
      api: {
        _id: newApi._id,
        name: newApi.name,
        url: newApi.url,
        parameters: newApi.parameters,
        endpoints: newApi.endpoints,
        visibility: newApi.visibility,
        dataCount: Array.isArray(newApi.data) ? newApi.data.length : 0,
        exampleCode: newApi.exampleCode, // ✅ return bhi kar rahe hain
      },
    });
  } catch (err) {
    console.error("❌ API create error:", err);
    return res.status(500).json({ message: "Failed to create API", error: err.message });
  }
});


/* -------------------------------------------------------------------------- */
/* 🟢 PUBLIC & USER-SPECIFIC APIs                                            */
/* -------------------------------------------------------------------------- */
router.get("/public", async (req, res) => {
  try {
    const apis = await UserApi.find({ visibility: "public" }).select("-data");
    res.json(apis);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch public APIs", error: err.message });
  }
});

router.get("/myApis", userAuth, async (req, res) => {
  try {
    const apis = await UserApi.find({ user: req.user._id });
    res.json(apis);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user APIs", error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟢 SERVE API DATA (Dynamic Filtering + Endpoints)                         */
/* -------------------------------------------------------------------------- */

// ✅ Main serve route
router.get("/serve/:slug", serveApiHandler);

// ✅ Sub-endpoint (e.g. /students or /data)
router.get("/serve/:slug/:sub", serveApiHandler);

// ✅ Sub-endpoint with ID (e.g. /students/0)
router.get("/serve/:slug/:sub/:id", serveApiHandler);
/* -------------------------------------------------------------------------- */
/* 🟢 GET USER API BY ID                                                      */
/* -------------------------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "API ID is required" });

    const api = await UserApi.findById(id);
    if (!api) return res.status(404).json({ message: "API not found" });

    return res.status(200).json({
      _id: api._id,
      user: api.user,
      name: api.name,
      description: api.description,
      category: api.category,
      version: api.version,
      parameters: api.parameters,
      endpoints: api.endpoints,
      visibility: api.visibility,
      fileType: api.fileType,
      data: api.data,
      exampleCode: api.exampleCode,
      url: api.url,
    });
  } catch (err) {
    console.error("❌ Fetch API by ID error:", err);
    return res.status(500).json({ message: "Failed to fetch API", error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟢 UPDATE USER API BY ID                                                   */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 🟢 UPDATE USER API BY ID (No Auth)                                        */
/* -------------------------------------------------------------------------- */
router.put("/:id", upload.single("file"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, version, parameters, endpoints, visibility } = req.body;

    const api = await UserApi.findById(id);
    if (!api) return res.status(404).json({ message: "API not found" });

    // Update fields if provided
    if (name) api.name = name;
    if (description) api.description = description;
    if (category) api.category = category;
    if (version) api.version = version;
    if (parameters) api.parameters = typeof parameters === "string" ? parameters : JSON.stringify(parameters);
    if (endpoints) api.endpoints = typeof endpoints === "string" ? endpoints : JSON.stringify(endpoints);
    if (visibility) api.visibility = visibility === "private" ? "private" : "public";

    // Handle uploaded file
    if (req.file) {
      const fileName = req.file.originalname.toLowerCase();
      let parsedData = [];
      let fileType = "none";

      if (fileName.endsWith(".csv")) {
        parsedData = await csv().fromString(req.file.buffer.toString());
        fileType = "csv";
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedData = xlsx.utils.sheet_to_json(sheet);
        fileType = "excel";
      } else if (fileName.endsWith(".json")) {
        parsedData = JSON.parse(req.file.buffer.toString());
        fileType = "json";
      } else {
        return res.status(400).json({ message: "Unsupported file format (allowed: csv, xlsx, xls, json)" });
      }

      api.data = parsedData;
      api.fileType = fileType;
    }

    // Update exampleCode if name changed
    if (name) {
      const url = `${req.protocol}://${req.get("host")}/userapi/serve/${api.slug}`;
      api.exampleCode = `// Example: Fetch data from your custom API
fetch("${url}")
  .then(response => response.json())
  .then(data => console.log("Fetched data:", data))
  .catch(error => console.error("Error:", error));`;
    }

    await api.save();

    return res.status(200).json({ message: "✅ API updated successfully", api });
  } catch (err) {
    console.error("❌ Update API error:", err);
    return res.status(500).json({ message: "Failed to update API", error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟢 DELETE USER API BY ID (No Auth)                                        */
/* -------------------------------------------------------------------------- */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const api = await UserApi.findById(id);
    if (!api) return res.status(404).json({ message: "API not found" });

    await api.remove();

    return res.status(200).json({ message: "✅ API deleted successfully" });
  } catch (err) {
    console.error("❌ Delete API error:", err);
    return res.status(500).json({ message: "Failed to delete API", error: err.message });
  }
});


async function serveApiHandler(req, res) {
  try {
    const { slug, sub, id } = req.params;
    const filters = req.query;

    const userApi = await UserApi.findOne({ slug });
    if (!userApi) return res.status(404).json({ message: "API not found" });

    let data = userApi.data;

    // ✅ Handle sub-endpoints like /students or /students/0
    if (sub) {
      if (id && !isNaN(id)) {
        const index = parseInt(id);
        data = userApi.data[index] ? [userApi.data[index]] : [];
      } else {
        data = userApi.data; // Return all for /students or any sub
      }
    }

    // ✅ Handle filters (e.g. ?Department=BSN%20Nursing)
    if (Object.keys(filters).length > 0) {
      data = data.filter((item) =>
        Object.keys(filters).every((key) => {
          const filterValue = filters[key].toString().toLowerCase().trim();
          const fieldValue = (item[key] || "").toString().toLowerCase().trim();
          return fieldValue === filterValue;
        })
      );
    }

    return res.status(200).json({
      message: "✅ Data fetched successfully",
      total: data.length,
      filters: filters,
      data: data,
    });
  } catch (error) {
    console.error("❌ Serve API error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

/* -------------------------------------------------------------------------- */
/* 🟢 Optional Auth Middleware                                               */
/* -------------------------------------------------------------------------- */
function userAuthOptional(req, res, next) {
  try {
    return userAuth(req, res, () => next());
  } catch {
    next();
  }
}

module.exports = router;

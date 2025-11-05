const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const csv = require("csvtojson");
const crypto = require("crypto");
const { userAuth } = require("../middleware/Auth");
const UserApi = require("../models/userApi");
const Notification = require("../models/notification");

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

// 🔔 Helper: create notification
async function createNotification({ userId, type, itemId, action, message }) {
  try {
    const notification = new Notification({
      user: userId,
      type,
      itemId,
      action,
      message,
    });
    await notification.save();
  } catch (err) {
    console.error("Notification error:", err.message);
  }
}

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE USER API                                                         */
/* -------------------------------------------------------------------------- */
router.post("/create", userAuth, upload.single("file"), async (req, res) => {
  try {
    const { name, description, category, version, parameters, endpoints, visibility } = req.body;
    if (!name) return res.status(400).json({ message: "API name is required" });

    let parsedData = [];
    let fileType = "none";

    if (req.file) {
      const fileName = req.file.originalname.toLowerCase();
      if (fileName.endsWith(".csv")) parsedData = await csv().fromString(req.file.buffer.toString()), fileType = "csv";
      else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedData = xlsx.utils.sheet_to_json(sheet);
        fileType = "excel";
      } else if (fileName.endsWith(".json")) {
        parsedData = JSON.parse(req.file.buffer.toString());
        fileType = "json";
      } else return res.status(400).json({ message: "Unsupported file format (allowed: csv, xlsx, xls, json)" });
    } else if (req.body.data) {
      parsedData = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
      fileType = "json";
    }

    const safeParameters = typeof parameters === "string" ? parameters : JSON.stringify(parameters || {});
    const safeEndpoints = typeof endpoints === "string" ? endpoints : JSON.stringify(endpoints || []);

    const slug = makeSlug(name);
    const url = `${process.env.BASE_URL}/userapi/serve/${slug}`;

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
      exampleCode,
    });

    await newApi.save();

    // 🔔 Create notification for new API
    await createNotification({
      userId: req.user._id,
      type: "UserApi",
      itemId: newApi._id,
      action: "new",
      message: `You created a new API: ${newApi.name}`
    });

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
        exampleCode: newApi.exampleCode,
      },
    });
  } catch (err) {
    console.error("❌ API create error:", err);
    return res.status(500).json({ message: "Failed to create API", error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟢 UPDATE USER API BY ID                                                   */
/* -------------------------------------------------------------------------- */
router.put("/:id", userAuth, upload.single("file"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, version, parameters, endpoints, visibility } = req.body;

    const api = await UserApi.findById(id);
    if (!api) return res.status(404).json({ message: "API not found" });

    const originalName = api.name;

    // Update fields
    if (name) api.name = name;
    if (description) api.description = description;
    if (category) api.category = category;
    if (version) api.version = version;
    if (parameters) api.parameters = typeof parameters === "string" ? parameters : JSON.stringify(parameters);
    if (endpoints) api.endpoints = typeof endpoints === "string" ? endpoints : JSON.stringify(endpoints);
    if (visibility) api.visibility = visibility === "private" ? "private" : "public";

    if (req.file) {
      const fileName = req.file.originalname.toLowerCase();
      let parsedData = [];
      let fileType = "none";

      if (fileName.endsWith(".csv")) parsedData = await csv().fromString(req.file.buffer.toString()), fileType = "csv";
      else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedData = xlsx.utils.sheet_to_json(sheet);
        fileType = "excel";
      } else if (fileName.endsWith(".json")) parsedData = JSON.parse(req.file.buffer.toString()), fileType = "json";
      else return res.status(400).json({ message: "Unsupported file format (allowed: csv, xlsx, xls, json)" });

      api.data = parsedData;
      api.fileType = fileType;
    }

    if (name) {
      const url = `${req.protocol}://${req.get("host")}/userapi/serve/${api.slug}`;
      api.exampleCode = `// Example: Fetch data from your custom API
fetch("${url}")
  .then(response => response.json())
  .then(data => console.log("Fetched data:", data))
  .catch(error => console.error("Error:", error));`;
    }

    await api.save();

    // 🔔 Notification logic
    if (String(api.user) !== String(req.user._id)) {
      // Agar koi aur user update kare, owner ko notify karo
      await createNotification({
        userId: api.user,
        type: "UserApi",
        itemId: api._id,
        action: "update",
        message: `${req.user.name || 'Someone'} updated your API: ${originalName}`
      });
    } else {
      // Agar owner khud update kare
      await createNotification({
        userId: api.user,
        type: "UserApi",
        itemId: api._id,
        action: "update",
        message: `You updated your API: ${api.name}`
      });
    }

    return res.status(200).json({ message: "✅ API updated successfully", api });
  } catch (err) {
    console.error("❌ Update API error:", err);
    return res.status(500).json({ message: "Failed to update API", error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟢 DELETE USER API BY ID                                                   */
/* -------------------------------------------------------------------------- */
router.delete("/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const api = await UserApi.findById(id);
    if (!api) return res.status(404).json({ message: "API not found" });

    await UserApi.deleteOne({ _id: id });

    // 🔔 Notification logic
    if (String(api.user) !== String(req.user._id)) {
      // Agar koi aur user delete kare, owner ko notify karo
      await createNotification({
        userId: api.user,
        type: "UserApi",
        itemId: id,
        action: "delete",
        message: `${req.user.name || 'Someone'} deleted your API: ${api.name}`
      });
    } else {
      // Agar owner khud delete kare
      await createNotification({
        userId: api.user,
        type: "UserApi",
        itemId: id,
        action: "delete",
        message: `You deleted your API: ${api.name}`
      });
    }

    return res.status(200).json({ message: "✅ API deleted successfully" });
  } catch (err) {
    console.error("❌ Delete API error:", err);
    return res.status(500).json({ message: "Failed to delete API", error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟢 Other routes (serve, get by ID, public, myApis) remain unchanged       */
/* -------------------------------------------------------------------------- */

// Serve API handler
async function serveApiHandler(req, res) {
  try {
    const { slug, sub, id } = req.params;
    const filters = req.query;

    const userApi = await UserApi.findOne({ slug });
    if (!userApi) return res.status(404).json({ message: "API not found" });

    let data = userApi.data;

    if (sub) {
      if (id && !isNaN(id)) {
        const index = parseInt(id);
        data = userApi.data[index] ? [userApi.data[index]] : [];
      } else data = userApi.data;
    }

    if (Object.keys(filters).length > 0) {
      data = data.filter((item) =>
        Object.keys(filters).every((key) => {
          const filterValue = filters[key].toString().toLowerCase().trim();
          const fieldValue = (item[key] || "").toString().toLowerCase().trim();
          return fieldValue === filterValue;
        })
      );
    }

    return res.status(200).json({ message: "✅ Data fetched successfully", total: data.length, filters, data });
  } catch (error) {
    console.error("❌ Serve API error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

router.get("/serve/:slug", serveApiHandler);
router.get("/serve/:slug/:sub", serveApiHandler);
router.get("/serve/:slug/:sub/:id", serveApiHandler);

router.get("/myApis", userAuth, async (req, res) => {
  try {
    const apis = await UserApi.find({ user: req.user._id });
    res.json(apis);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user APIs", error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "API ID is required" });
    const api = await UserApi.findById(id);
    if (!api) return res.status(404).json({ message: "API not found" });
    return res.status(200).json(api);
  } catch (err) {
    console.error("❌ Fetch API by ID error:", err);
    return res.status(500).json({ message: "Failed to fetch API", error: err.message });
  }
});

module.exports = router;

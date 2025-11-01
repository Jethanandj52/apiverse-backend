const mongoose = require("mongoose");
const { Schema } = mongoose;

const storeSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    apis: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Api",
      },
    ],
    libraries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Library",
      },
    ],
      userApis: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserApi" }],
  },
  {
    collection: "stores",
    timestamps: true,
  }
);

const Store = mongoose.model("Store", storeSchema);
module.exports = Store;

const mongoose = require('mongoose');

async function connectToDB(){
    // Connection of Clusters 
    await mongoose.connect(process.env.DB)
}

module.exports = {
    connectToDB
}   
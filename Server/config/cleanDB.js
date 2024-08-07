// cleanDB.js
const { User } = require('../models');

const cleanDB = async (modelName, collectionName) => {
  try {
    if (modelName === 'User') {
      await User.deleteMany({});
    } 
     else {
      console.error(`Unknown model: ${modelName}`);
    }
   
  } catch (error) {
    console.error(`Error cleaning ${collectionName} collection:`, error);
  }
};

module.exports = cleanDB;


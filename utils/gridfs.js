const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const GRIDFS_BUCKET_NAME = 'mangaFiles';

let gridfsBucket = null;
let filesCollection = null;

const initGridFS = () => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB is not connected. GridFS cannot be initialized.');
  }

  gridfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: GRIDFS_BUCKET_NAME
  });

  filesCollection = mongoose.connection.db.collection(`${GRIDFS_BUCKET_NAME}.files`);
};

const getGridFSBucket = () => {
  if (!gridfsBucket) {
    throw new Error('GridFS bucket is not initialized. Call initGridFS() after DB connection.');
  }

  return gridfsBucket;
};

const getGridFSFilesCollection = () => {
  if (!filesCollection) {
    throw new Error('GridFS files collection is not initialized. Call initGridFS() first.');
  }

  return filesCollection;
};

module.exports = {
  GRIDFS_BUCKET_NAME,
  initGridFS,
  getGridFSBucket,
  getGridFSFilesCollection
};

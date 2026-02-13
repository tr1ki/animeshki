const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const Manga = require("../models/Manga");
const {
  initGridFS,
  getGridFSBucket,
  getGridFSFilesCollection,
} = require("../utils/gridfs");

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".zip",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mimeAllowed = ALLOWED_MIME_TYPES.has(file.mimetype);
    const extensionAllowed = ALLOWED_EXTENSIONS.has(extension);

    if (!mimeAllowed || !extensionAllowed) {
      const error = new Error(
        "Unsupported file type. Allowed: zip, pdf, images",
      );
      error.statusCode = 400;
      return cb(error);
    }

    return cb(null, true);
  },
});

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mimeAllowed = IMAGE_MIME_TYPES.has(file.mimetype);
    const extensionAllowed = IMAGE_EXTENSIONS.has(extension);

    if (!mimeAllowed || !extensionAllowed) {
      const error = new Error("Unsupported cover type. Allowed: images only");
      error.statusCode = 400;
      return cb(error);
    }

    return cb(null, true);
  },
});

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const sanitizeFilename = (filename) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, "_");

const getFileKind = (file) => {
  const extension = path.extname(file.originalname || "").toLowerCase();

  if (
    file.mimetype.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)
  ) {
    return "image";
  }

  if (file.mimetype === "application/pdf" || extension === ".pdf") {
    return "pdf";
  }

  if (
    file.mimetype === "application/zip" ||
    file.mimetype === "application/x-zip-compressed" ||
    extension === ".zip"
  ) {
    return "zip";
  }

  return null;
};

const getGridFSResources = () => {
  try {
    return {
      bucket: getGridFSBucket(),
      filesCollection: getGridFSFilesCollection(),
    };
  } catch (error) {
    initGridFS();

    return {
      bucket: getGridFSBucket(),
      filesCollection: getGridFSFilesCollection(),
    };
  }
};

const isOwner = (manga, userId) => {
  const ownerId =
    manga.owner && manga.owner._id ? manga.owner._id : manga.owner;
  return Boolean(ownerId && ownerId.toString() === userId);
};

const canModerate = (user) =>
  Boolean(user && ["moderator", "admin"].includes(user.role));

const canAccessPrivateManga = (user, manga) => {
  if (!user) {
    return false;
  }

  if (canModerate(user)) {
    return true;
  }

  return isOwner(manga, user.id);
};

const parsePageNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return NaN;
  }

  return parsed;
};

const mapMangaFile = (mangaId, file) => ({
  id: file.fileId,
  filename: file.filename,
  originalName: file.originalName,
  contentType: file.contentType,
  size: file.size,
  kind: file.kind,
  pageNumber: file.pageNumber || null,
  uploadedAt: file.uploadedAt,
  streamUrl: `/api/manga/${mangaId}/pages?fileId=${file.fileId}`,
});

const getPublicManga = async (req, res, next) => {
  try {
    const mangaList = await Manga.find({ status: "approved" })
      .populate("owner", "username role")
      .sort({ createdAt: -1 });

    return res.json(mangaList);
  } catch (error) {
    return next(error);
  }
};

const getPublicMangaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid manga id" });
    }

    const manga = await Manga.findOne({ _id: id, status: "approved" })
      .populate("owner", "username role")
      .populate("moderatedBy", "username role");

    if (!manga) {
      return res.status(404).json({ message: "Manga not found" });
    }

    return res.json(manga);
  } catch (error) {
    return next(error);
  }
};

const getMyManga = async (req, res, next) => {
  try {
    const mangaList = await Manga.find({ owner: req.user.id })
      .populate("owner", "username role")
      .populate("moderatedBy", "username role")
      .sort({ createdAt: -1 });

    return res.json(mangaList);
  } catch (error) {
    return next(error);
  }
};

const createManga = async (req, res, next) => {
  try {
    const { title, genre, chapters, description, releaseYear } = req.body;

    if (!title || !description || !genre || !chapters || !releaseYear) {
      return res
        .status(400)
        .json({
          message:
            "title, genre, chapters, description, releaseYear are required",
        });
    }

    const genreList = Array.isArray(genre) ? genre : [genre];

    const manga = await Manga.create({
      title: title.trim(),
      genre: genreList,
      chapters: Number(chapters),
      description: description.trim(),
      releaseYear: Number(releaseYear),
      owner: req.user.id,
      status: "pending",
    });

    const created = await Manga.findById(manga._id).populate(
      "owner",
      "username role",
    );

    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
};

const updateManga = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid manga id" });
    }

    const manga = await Manga.findById(id);

    if (!manga) {
      return res.status(404).json({ message: "Manga not found" });
    }

    if (!isOwner(manga, req.user.id) && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only owner or admin can update manga" });
    }

    const fields = ["title", "genre", "chapters", "description", "releaseYear"];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        manga[field] = req.body[field];
      }
    });

    manga.status = "pending";
    manga.moderatedBy = undefined;
    manga.moderatedAt = undefined;
    manga.rejectionReason = undefined;

    await manga.save();

    const updated = await Manga.findById(manga._id)
      .populate("owner", "username role")
      .populate("moderatedBy", "username role");

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const uploadMangaFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid manga id" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({
          message:
            'File is required. Use multipart/form-data with field "file"',
        });
    }

    const manga = await Manga.findById(id);

    if (!manga) {
      return res.status(404).json({ message: "Manga not found" });
    }

    if (!isOwner(manga, req.user.id) && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only owner can upload files for this manga" });
    }

    if (!manga.cover || !manga.cover.fileId) {
      return res.status(400).json({ message: "Upload cover before pages" });
    }

    const kind = getFileKind(req.file);

    if (!kind) {
      return res
        .status(400)
        .json({ message: "Unsupported file type. Allowed: zip, pdf, images" });
    }

    let pageNumber = parsePageNumber(req.body.pageNumber);

    if (Number.isNaN(pageNumber)) {
      return res
        .status(400)
        .json({ message: "pageNumber must be a positive integer" });
    }

    if (kind === "image" && pageNumber === null) {
      const imageFiles = manga.files.filter(
        (file) => file.kind === "image" && file.pageNumber,
      );
      const maxPage = imageFiles.length
        ? Math.max(...imageFiles.map((file) => file.pageNumber))
        : 0;
      pageNumber = maxPage + 1;
    }

    if (kind === "image" && pageNumber !== null) {
      const pageAlreadyExists = manga.files.some(
        (file) => file.kind === "image" && file.pageNumber === pageNumber,
      );

      if (pageAlreadyExists) {
        return res
          .status(409)
          .json({ message: `Image page ${pageNumber} already exists` });
      }
    }

    if (kind !== "image") {
      pageNumber = null;
    }

    const { bucket } = getGridFSResources();
    const filename = `${manga._id}-${Date.now()}-${sanitizeFilename(req.file.originalname)}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: {
        mangaId: manga._id.toString(),
        ownerId: manga.owner.toString(),
        uploadedBy: req.user.id,
        kind,
        pageNumber,
        originalName: req.file.originalname,
      },
    });

    await new Promise((resolve, reject) => {
      uploadStream.on("error", reject);
      uploadStream.on("finish", resolve);
      uploadStream.end(req.file.buffer);
    });

    manga.files.push({
      fileId: uploadStream.id,
      filename,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
      kind,
      pageNumber,
    });

    manga.status = "pending";
    manga.moderatedBy = undefined;
    manga.moderatedAt = undefined;
    manga.rejectionReason = undefined;

    await manga.save();

    const newFile = manga.files[manga.files.length - 1];

    return res.status(201).json({
      message:
        "File uploaded successfully. Manga status set to pending moderation",
      status: manga.status,
      file: mapMangaFile(manga._id, newFile),
    });
  } catch (error) {
    return next(error);
  }
};

const uploadMangaCover = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid manga id" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({
          message:
            'Cover image is required. Use multipart/form-data with field "file"',
        });
    }

    const manga = await Manga.findById(id);

    if (!manga) {
      return res.status(404).json({ message: "Manga not found" });
    }

    if (!isOwner(manga, req.user.id) && req.user.role !== "admin") {
      return res
        .status(403)
        .json({
          message: "Only owner or admin can upload cover for this manga",
        });
    }

    const { bucket } = getGridFSResources();
    const filename = `${manga._id}-cover-${Date.now()}-${sanitizeFilename(req.file.originalname)}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: {
        mangaId: manga._id.toString(),
        ownerId: manga.owner.toString(),
        uploadedBy: req.user.id,
        kind: "cover",
        originalName: req.file.originalname,
      },
    });

    await new Promise((resolve, reject) => {
      uploadStream.on("error", reject);
      uploadStream.on("finish", resolve);
      uploadStream.end(req.file.buffer);
    });

    if (manga.cover && manga.cover.fileId && isObjectId(manga.cover.fileId)) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(manga.cover.fileId));
      } catch (error) {
        if (error.code !== 26) {
          throw error;
        }
      }
    }

    manga.cover = {
      fileId: uploadStream.id.toString(),
      filename,
      uploadedAt: new Date(),
    };

    manga.status = "pending";
    manga.moderatedBy = undefined;
    manga.moderatedAt = undefined;
    manga.rejectionReason = undefined;

    await manga.save();

    return res.status(201).json({
      message: "Cover uploaded successfully",
      coverUrl: `/api/manga/${manga._id}/cover`,
    });
  } catch (error) {
    return next(error);
  }
};

const getMangaCover = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid manga id" });
    }

    const manga = await Manga.findById(id);

    if (!manga || manga.status !== "approved") {
      return res.status(404).json({ message: "Cover not found" });
    }

    if (!manga.cover || !manga.cover.fileId) {
      return res.status(404).json({ message: "Cover not found" });
    }

    if (!isObjectId(manga.cover.fileId)) {
      return res.status(404).json({ message: "Cover not found" });
    }

    const { bucket, filesCollection } = getGridFSResources();
    const coverObjectId = new mongoose.Types.ObjectId(manga.cover.fileId);
    const storedFile = await filesCollection.findOne({ _id: coverObjectId });

    if (!storedFile) {
      return res.status(404).json({ message: "Cover not found" });
    }

    res.setHeader(
      "Content-Type",
      storedFile.contentType || "application/octet-stream",
    );
    const downloadStream = bucket.openDownloadStream(coverObjectId);

    downloadStream.on("error", (error) => {
      if (!res.headersSent) {
        return res.status(404).json({ message: "Could not read cover stream" });
      }

      return next(error);
    });

    return downloadStream.pipe(res);
  } catch (error) {
    return next(error);
  }
};

const getMangaPages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fileId, download } = req.query;

    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid manga id" });
    }

    const manga = await Manga.findById(id).populate("owner", "username role");

    if (!manga) {
      return res.status(404).json({ message: "Manga not found" });
    }

    const isPublic = manga.status === "approved";

    if (!isPublic && !canAccessPrivateManga(req.user, manga)) {
      return res
        .status(403)
        .json({ message: "Not allowed to access files for this manga" });
    }

    if (!fileId) {
      const sortedFiles = [...manga.files].sort((a, b) => {
        if (a.pageNumber && b.pageNumber) {
          return a.pageNumber - b.pageNumber;
        }

        if (a.pageNumber) {
          return -1;
        }

        if (b.pageNumber) {
          return 1;
        }

        return a.uploadedAt - b.uploadedAt;
      });

      return res.json({
        mangaId: manga._id,
        status: manga.status,
        files: sortedFiles.map((file) => mapMangaFile(manga._id, file)),
      });
    }

    if (!isObjectId(fileId)) {
      return res.status(400).json({ message: "Invalid file id" });
    }

    const fileMetadata = manga.files.find(
      (file) => file.fileId.toString() === fileId,
    );

    if (!fileMetadata) {
      return res.status(404).json({ message: "File not found for this manga" });
    }

    const { bucket, filesCollection } = getGridFSResources();
    const storedFile = await filesCollection.findOne({
      _id: fileMetadata.fileId,
    });

    if (!storedFile) {
      return res
        .status(404)
        .json({ message: "Stored file does not exist in GridFS" });
    }

    res.setHeader(
      "Content-Type",
      storedFile.contentType ||
        fileMetadata.contentType ||
        "application/octet-stream",
    );

    if (download === "true") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${sanitizeFilename(fileMetadata.originalName)}"`,
      );
    }

    const downloadStream = bucket.openDownloadStream(fileMetadata.fileId);

    downloadStream.on("error", (error) => {
      if (!res.headersSent) {
        return res.status(404).json({ message: "Could not read file stream" });
      }

      return next(error);
    });

    return downloadStream.pipe(res);
  } catch (error) {
    return next(error);
  }
};

const getPendingManga = async (req, res, next) => {
  try {
    if (!canModerate(req.user)) {
      return res
        .status(403)
        .json({ message: "Only moderator or admin can view pending manga" });
    }

    const pendingList = await Manga.find({ status: "pending" })
      .populate("owner", "username role")
      .sort({ createdAt: -1 });

    return res.json(pendingList);
  } catch (error) {
    return next(error);
  }
};

const approveManga = async (req, res, next) => {
  try {
    if (!canModerate(req.user)) {
      return res
        .status(403)
        .json({ message: "Only moderator or admin can approve manga" });
    }

    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid manga id" });
    }

    const manga = await Manga.findById(id);

    if (!manga) {
      return res.status(404).json({ message: "Manga not found" });
    }

    manga.status = "approved";
    manga.moderatedBy = req.user.id;
    manga.moderatedAt = new Date();
    manga.rejectionReason = undefined;

    await manga.save();

    const updated = await Manga.findById(manga._id)
      .populate("owner", "username role")
      .populate("moderatedBy", "username role");

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const rejectManga = async (req, res, next) => {
  try {
    if (!canModerate(req.user)) {
      return res
        .status(403)
        .json({ message: "Only moderator or admin can reject manga" });
    }

    const { id } = req.params;
    const reason = req.body.reason?.trim();

    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid manga id" });
    }

    const manga = await Manga.findById(id);

    if (!manga) {
      return res.status(404).json({ message: "Manga not found" });
    }

    manga.status = "rejected";
    manga.moderatedBy = req.user.id;
    manga.moderatedAt = new Date();
    manga.rejectionReason = reason || "";

    await manga.save();

    const updated = await Manga.findById(manga._id)
      .populate("owner", "username role")
      .populate("moderatedBy", "username role");

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const deleteManga = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid manga id" });
    }

    const manga = await Manga.findById(id);

    if (!manga) {
      return res.status(404).json({ message: "Manga not found" });
    }

    const canDelete =
      isOwner(manga, req.user.id) ||
      ["admin", "moderator"].includes(req.user.role);

    if (!canDelete) {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this manga" });
    }

    const { bucket } = getGridFSResources();

    if (manga.cover && manga.cover.fileId && isObjectId(manga.cover.fileId)) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(manga.cover.fileId));
      } catch (error) {
        if (error.code !== 26) {
          throw error;
        }
      }
    }

    if (manga.files.length) {
      await Promise.all(
        manga.files.map(async (file) => {
          try {
            await bucket.delete(file.fileId);
          } catch (error) {
            if (error.code !== 26) {
              throw error;
            }
          }
        }),
      );
    }

    await manga.deleteOne();

    return res.json({ message: "Manga deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

const handleMangaUpload = upload.single("file");
const handleCoverUpload = coverUpload.single("file");

module.exports = {
  handleMangaUpload,
  handleCoverUpload,
  getPublicManga,
  getPublicMangaById,
  getMyManga,
  createManga,
  updateManga,
  uploadMangaCover,
  uploadMangaFile,
  getMangaCover,
  getMangaPages,
  getPendingManga,
  approveManga,
  rejectManga,
  deleteManga,
  getAllManga: getPublicManga,
  getMangaById: getPublicMangaById,
};

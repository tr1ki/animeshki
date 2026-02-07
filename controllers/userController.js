const User = require('../models/User');

const selectUserFields = '-password -__v';

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(selectUserFields);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

const getProfile = async (req, res, next) => {
  return getMe(req, res, next);
};

const updateProfile = async (req, res, next) => {
  try {
    const updates = {};

    if (req.body.username) {
      updates.username = req.body.username.trim();
    }

    if (req.body.email) {
      updates.email = req.body.email.trim().toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select(selectUserFields);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

const getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('favorites favoritesModel');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      favorites: user.favorites,
      favoritesModel: user.favoritesModel
    });
  } catch (error) {
    return next(error);
  }
};

const addFavorite = async (req, res, next) => {
  try {
    const { itemId, model } = req.body;

    if (!itemId || !model || !['Anime', 'Manga'].includes(model)) {
      return res.status(400).json({ message: 'itemId and model (Anime or Manga) are required' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.favoritesModel = model;

    if (!user.favorites.some((fav) => fav.toString() === itemId)) {
      user.favorites.push(itemId);
    }

    await user.save();

    return res.status(201).json({
      favorites: user.favorites,
      favoritesModel: user.favoritesModel
    });
  } catch (error) {
    return next(error);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.favorites = user.favorites.filter((favoriteId) => favoriteId.toString() !== id);
    await user.save();

    return res.json({
      favorites: user.favorites,
      favoritesModel: user.favoritesModel
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMe,
  getProfile,
  updateProfile,
  getFavorites,
  addFavorite,
  removeFavorite
};

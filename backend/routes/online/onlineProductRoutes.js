const express = require('express');
const { upload } = require('../../utils/online/uploadS3');
const {
  getAllOnlineProducts,
  getOnlineProductById,
  createOnlineProduct,
  updateOnlineProduct,
  deleteOnlineProduct,
  getFrequentlyBoughtTogether,
} = require('../../controllers/online/onlineProductController');

const router = express.Router();

// Online Product CRUD routes
router.get('/', getAllOnlineProducts);
router.get('/:id', getOnlineProductById);
router.get('/:id/frequently-bought-together', getFrequentlyBoughtTogether);
router.post('/', upload.array('images', 20), createOnlineProduct);
router.put('/:id', upload.array('images', 20), updateOnlineProduct);
router.delete('/:id', deleteOnlineProduct);

module.exports = router;

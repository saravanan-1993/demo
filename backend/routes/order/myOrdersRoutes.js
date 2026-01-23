const express = require("express");
const router = express.Router();
const { getMyOrders, getOrderByNumber, downloadOrderInvoice } = require("../../controllers/order/myOrdersController");

/**
 * @route   GET /api/online/my-orders
 * @desc    Get all orders for a user
 * @access  Public
 */
router.get("/", getMyOrders);

/**
 * @route   GET /api/online/my-orders/:orderNumber/invoice/download
 * @desc    Download order invoice PDF
 * @access  Public
 */
router.get("/:orderNumber/invoice/download", downloadOrderInvoice);

/**
 * @route   GET /api/online/my-orders/:orderNumber
 * @desc    Get single order by order number
 * @access  Public
 */
router.get("/:orderNumber", getOrderByNumber);

module.exports = router;

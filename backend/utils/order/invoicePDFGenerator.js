/**
 * Invoice PDF Generator for Online Orders
 * Generates PDF invoices matching the purchase-details design
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate invoice PDF for an online order matching purchase-details design
 * @param {Object} orderData - Complete order data with customer and items
 * @param {Object} companyData - Company information for the invoice
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateInvoicePDF = async (orderData, companyData) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get logo data and currency symbol
      const [logoData, currencySymbol] = await Promise.all([
        getLogoData(),
        getCurrencySymbol()
      ]);
      
      // Create a new PDF document with A4 size
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 40,
        bufferPages: true
      });

      // Collect PDF data in chunks
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Start generating the PDF content matching purchase-details design
      generatePurchaseStyleInvoice(doc, orderData, companyData, logoData, currencySymbol);

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate invoice content matching purchase-details design
 * @param {PDFDocument} doc - PDF document instance
 * @param {Object} orderData - Order data
 * @param {Object} companyData - Company data
 * @param {String} logoData - Base64 logo data
 * @param {String} currencySymbol - Currency symbol (₹, $, €, etc.)
 */
const generatePurchaseStyleInvoice = (doc, orderData, companyData, logoData, currencySymbol) => {
  const pageWidth = doc.page.width - 80; // Account for margins
  const leftMargin = 40;

  // Add red accent border at top
  doc.rect(leftMargin, 40, pageWidth, 8)
     .fillAndStroke('#e22a2a', '#e22a2a');

  // Header Section with beige background
  generatePurchaseStyleHeader(doc, orderData, companyData, pageWidth, leftMargin, logoData);

  // Address Section
  generatePurchaseStyleAddresses(doc, orderData, companyData, pageWidth, leftMargin);

  // Items Table
  generatePurchaseStyleItemsTable(doc, orderData, pageWidth, leftMargin, currencySymbol);

  // Summary Section
  generatePurchaseStyleSummary(doc, orderData, pageWidth, leftMargin, currencySymbol);

  // Signature Section
  generatePurchaseStyleSignature(doc, orderData, pageWidth, leftMargin);

  // Footer with accent border
  generatePurchaseStyleFooter(doc, orderData, pageWidth, leftMargin);
};

/**
 * Generate header section matching purchase-details design
 */
const generatePurchaseStyleHeader = (doc, orderData, companyData, pageWidth, leftMargin, logoData) => {
  const headerY = 60;
  const headerHeight = 140;

  // Beige background for header
  doc.rect(leftMargin, headerY, pageWidth, headerHeight)
     .fillAndStroke('#e8e4d9', '#d4cdb8');

  // Logo section (left side)
  const logoX = leftMargin + 30;
  const logoY = headerY + 30;
  
  if (logoData) {
    try {
      doc.image(logoData, logoX, logoY, {
        width: 140,
        height: 70,
        fit: [140, 70],
        align: 'left',
        valign: 'center'
      });
    } catch (error) {
      console.error('Error embedding logo:', error);
      // Fallback logo placeholder matching the image
      doc.rect(logoX, logoY, 140, 70)
         .fillAndStroke('#ffffff80', '#a89b7e');
      doc.fontSize(14)
         .fillColor('#e22a2a')
         .text('LEATS', logoX + 50, logoY + 20);
      doc.fontSize(10)
         .fillColor('#64748b')
         .text('Daily Fresh Delivery', logoX + 35, logoY + 40);
    }
  } else {
    // Fallback logo placeholder matching the image
    doc.rect(logoX, logoY, 140, 70)
       .fillAndStroke('#ffffff80', '#a89b7e');
    doc.fontSize(14)
       .fillColor('#e22a2a')
       .text('LEATS', logoX + 50, logoY + 20);
    doc.fontSize(10)
       .fillColor('#64748b')
       .text('Daily Fresh Delivery', logoX + 35, logoY + 40);
  }

  // INVOICE title (right side)
  const titleX = pageWidth - 250;
  
  doc.fontSize(48)
     .fillColor('#000000')
     .text('INVOICE', titleX, headerY + 20, { 
       width: 250, 
       align: 'right',
       characterSpacing: 8
     });

  // Order details table (right side)
  const detailsY = headerY + 75;
  const detailsWidth = 220;
  const detailsX = pageWidth - detailsWidth + leftMargin;
  
  // Details table with proper borders
  const tableData = [
    ['Invoice Number', orderData.invoiceNumber || orderData.orderNumber],
    ['Invoice Date', formatDate(orderData.createdAt)],
    ['Order Number', orderData.orderNumber]
  ];

  let currentDetailY = detailsY;
  
  tableData.forEach((row, index) => {
    // Row background (alternating)
    if (index % 2 === 0) {
      doc.rect(detailsX, currentDetailY, detailsWidth, 18)
         .fillAndStroke('#f8f9fa', '#d4cdb8');
    }
    
    // Label
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(row[0], detailsX + 8, currentDetailY + 5, { width: 100 });
    
    // Value
    doc.fontSize(9)
       .fillColor('#000000')
       .text(row[1], detailsX + 110, currentDetailY + 5, { 
         width: 100, 
         align: 'right' 
       });
    
    currentDetailY += 18;
  });

  // Border around details table
  doc.rect(detailsX, detailsY, detailsWidth, 54)
     .stroke('#a89b7e');

  doc.y = headerY + headerHeight + 20;
};

/**
 * Generate address section matching purchase-details design
 */
const generatePurchaseStyleAddresses = (doc, orderData, companyData, pageWidth, leftMargin) => {
  const startY = doc.y;
  const columnWidth = (pageWidth - 60) / 2;

  // BILL FROM (Left Column)
  doc.fontSize(10)
     .fillColor('#64748b')
     .text('BILL FROM', leftMargin, startY, { 
       characterSpacing: 1.5 
     });

  let currentY = startY + 20;
  
  // Company name
  doc.fontSize(16)
     .fillColor('#000000')
     .text(companyData.companyName || 'Ecommerce Surface', leftMargin, currentY);
  currentY += 22;

  // Company address
  if (companyData.address) {
    doc.fontSize(11)
       .fillColor('#64748b')
       .text(companyData.address || 'Street Address', leftMargin, currentY, { 
         width: columnWidth - 20,
         lineGap: 2
       });
    currentY += 16;
  }

  // City, State, ZIP
  const cityStateZip = [
    companyData.city || 'City',
    companyData.state || 'State', 
    companyData.zipCode || 'ZIP Code'
  ].filter(Boolean).join(', ');
  
  doc.fontSize(11)
     .fillColor('#64748b')
     .text(cityStateZip, leftMargin, currentY);
  currentY += 16;

  // Phone and Email
  if (companyData.phone) {
    doc.text(`Phone: ${companyData.phone}`, leftMargin, currentY);
    currentY += 16;
  }

  if (companyData.email) {
    doc.text(`Email: ${companyData.email}`, leftMargin, currentY);
    currentY += 16;
  }

  // BILL TO (Right Column)
  const rightColumnX = leftMargin + columnWidth + 60;
  doc.fontSize(10)
     .fillColor('#64748b')
     .text('BILL TO', rightColumnX, startY, { 
       characterSpacing: 1.5 
     });

  let rightCurrentY = startY + 20;
  
  // Customer name
  doc.fontSize(16)
     .fillColor('#000000')
     .text(orderData.customerName || 'Customer Name', rightColumnX, rightCurrentY);
  rightCurrentY += 22;

  // Delivery address
  const deliveryAddress = orderData.deliveryAddress || {};
  
  if (deliveryAddress.addressLine1) {
    doc.fontSize(11)
       .fillColor('#64748b')
       .text(deliveryAddress.addressLine1, rightColumnX, rightCurrentY, { 
         width: columnWidth - 20,
         lineGap: 2
       });
    rightCurrentY += 16;
  }

  if (deliveryAddress.addressLine2) {
    doc.text(deliveryAddress.addressLine2, rightColumnX, rightCurrentY);
    rightCurrentY += 16;
  }

  if (deliveryAddress.landmark) {
    doc.text(`Near: ${deliveryAddress.landmark}`, rightColumnX, rightCurrentY);
    rightCurrentY += 16;
  }

  // City, State, PIN
  const customerCityState = [
    deliveryAddress.city,
    deliveryAddress.state,
    deliveryAddress.pincode
  ].filter(Boolean).join(', ');
  
  if (customerCityState) {
    doc.text(customerCityState, rightColumnX, rightCurrentY);
    rightCurrentY += 16;
  }

  // Phone and Email
  if (deliveryAddress.phone || orderData.customerPhone) {
    doc.text(`Phone: ${deliveryAddress.phone || orderData.customerPhone}`, rightColumnX, rightCurrentY);
    rightCurrentY += 16;
  }

  if (orderData.customerEmail) {
    doc.text(`Email: ${orderData.customerEmail}`, rightColumnX, rightCurrentY);
    rightCurrentY += 16;
  }

  // Set Y position to the maximum of both columns
  doc.y = Math.max(currentY, rightCurrentY) + 30;
};

/**
 * Generate items table matching purchase-details design
 */
const generatePurchaseStyleItemsTable = (doc, orderData, pageWidth, leftMargin, currencySymbol) => {
  const startY = doc.y;
  const tableWidth = pageWidth;
  
  // Table headers matching the image
  const headers = ['#', 'ITEM DESCRIPTION', 'HSN', 'QTY', 'RATE', 'GST', 'AMOUNT'];
  const columnWidths = [40, 220, 60, 60, 80, 60, 80];
  
  let currentX = leftMargin;
  const columnPositions = [];
  columnWidths.forEach(width => {
    columnPositions.push(currentX);
    currentX += width;
  });

  // Header row with gray background
  doc.rect(leftMargin, startY, tableWidth, 25)
     .fillAndStroke('#f8f9fa', '#dee2e6');

  // Header text
  doc.fontSize(10)
     .fillColor('#495057');
  
  headers.forEach((header, index) => {
    const xPos = columnPositions[index];
    const width = columnWidths[index];
    let align = 'left';
    
    if (index === 0 || index === 2 || index === 3 || index === 5) align = 'center'; // #, HSN, QTY, GST
    if (index === 4 || index === 6) align = 'right'; // RATE, AMOUNT
    
    doc.text(header, xPos + 5, startY + 8, { 
      width: width - 10, 
      align: align
    });
  });

  let currentY = startY + 30;

  // Items
  orderData.items.forEach((item, index) => {
    const rowHeight = 30;
    
    // Alternate row background
    if (index % 2 === 1) {
      doc.rect(leftMargin, currentY - 3, tableWidth, rowHeight)
         .fillAndStroke('#f8f9fa', '#f8f9fa');
    }

    // Row data
    doc.fontSize(10)
       .fillColor('#212529');

    // Index
    doc.text((index + 1).toString(), columnPositions[0] + 5, currentY + 8, { 
      width: columnWidths[0] - 10, 
      align: 'center' 
    });

    // Product name
    const productName = item.productName || item.variantName || 'Product';
    doc.text(productName, columnPositions[1] + 5, currentY + 5, { 
      width: columnWidths[1] - 10,
      ellipsis: true
    });
    
    // Variant name if different and available
    if (item.variantName && item.variantName !== item.productName) {
      doc.fontSize(8)
         .fillColor('#6c757d')
         .text(item.variantName, columnPositions[1] + 5, currentY + 17, {
           width: columnWidths[1] - 10,
           ellipsis: true
         });
    }

    // HSN Code
    doc.fontSize(10)
       .fillColor('#212529')
       .text(item.hsnCode || '-', columnPositions[2] + 5, currentY + 8, { 
         width: columnWidths[2] - 10, 
         align: 'center' 
       });

    // Quantity
    doc.text(item.quantity.toString(), columnPositions[3] + 5, currentY + 8, { 
      width: columnWidths[3] - 10, 
      align: 'center' 
    });

    // Rate
    const unitPrice = item.unitPrice || item.variantSellingPrice || 0;
    doc.text(`${currencySymbol}${unitPrice.toFixed(2)}`, columnPositions[4] + 5, currentY + 8, { 
      width: columnWidths[4] - 10, 
      align: 'right' 
    });

    // GST
    const gstPercentage = item.gstPercentage || 0;
    doc.text(`${Math.round(gstPercentage)}%`, columnPositions[5] + 5, currentY + 8, { 
      width: columnWidths[5] - 10, 
      align: 'center' 
    });

    // Amount
    const totalAmount = item.total || (item.quantity * unitPrice);
    doc.text(`${currencySymbol}${totalAmount.toFixed(2)}`, columnPositions[6] + 5, currentY + 8, { 
      width: columnWidths[6] - 10, 
      align: 'right' 
    });

    currentY += rowHeight;
  });

  // Table border
  doc.rect(leftMargin, startY, tableWidth, currentY - startY)
     .stroke('#dee2e6');

  // Column separators
  columnPositions.slice(1).forEach((x) => {
    doc.moveTo(x, startY)
       .lineTo(x, currentY)
       .stroke('#dee2e6');
  });

  doc.y = currentY + 20;
};

/**
 * Generate summary section matching purchase-details design
 */
const generatePurchaseStyleSummary = (doc, orderData, pageWidth, leftMargin, currencySymbol) => {
  const startY = doc.y;
  const summaryX = pageWidth - 180;
  const summaryWidth = 180;

  // Determine if this is an inter-state transaction (IGST)
  const isInterState = (orderData.igstAmount || 0) > 0;

  const summaryItems = [
    ['Subtotal', `${currencySymbol}${(orderData.subtotal || 0).toFixed(2)}`]
  ];

  // Add GST breakdown
  if (isInterState) {
    if ((orderData.igstAmount || 0) > 0) {
      summaryItems.push(['IGST', `${currencySymbol}${(orderData.igstAmount || 0).toFixed(2)}`]);
    }
  } else {
    if ((orderData.cgstAmount || 0) > 0) {
      summaryItems.push(['CGST', `${currencySymbol}${(orderData.cgstAmount || 0).toFixed(2)}`]);
    }
    if ((orderData.sgstAmount || 0) > 0) {
      summaryItems.push(['SGST', `${currencySymbol}${(orderData.sgstAmount || 0).toFixed(2)}`]);
    }
  }

  // Fallback for orders without GST breakdown
  if (!isInterState && !(orderData.cgstAmount || orderData.sgstAmount) && (orderData.tax || 0) > 0) {
    summaryItems.push(['GST', `${currencySymbol}${(orderData.tax || 0).toFixed(2)}`]);
  }

  // Add discount if present
  if ((orderData.discount || 0) > 0) {
    summaryItems.push(['Discount', `-${currencySymbol}${(orderData.discount || 0).toFixed(2)}`]);
  }

  if ((orderData.couponDiscount || 0) > 0) {
    summaryItems.push(['Coupon Discount', `-${currencySymbol}${(orderData.couponDiscount || 0).toFixed(2)}`]);
  }

  // Add shipping if present
  if ((orderData.shippingCharge || 0) > 0) {
    summaryItems.push(['Shipping', `${currencySymbol}${(orderData.shippingCharge || 0).toFixed(2)}`]);
  }

  // Summary items
  summaryItems.forEach((item, index) => {
    const yPos = startY + (index * 20);
    
    doc.fontSize(11)
       .fillColor('#495057')
       .text(item[0], summaryX, yPos, { width: 100, align: 'left' });
    
    const isDiscount = item[0].toLowerCase().includes('discount');
    doc.fillColor(isDiscount ? '#dc3545' : '#212529')
       .text(item[1], summaryX + 110, yPos, { width: 70, align: 'right' });
  });

  // Total row with border
  const totalY = startY + (summaryItems.length * 20) + 10;
  
  // Border above total
  doc.moveTo(summaryX, totalY - 5)
     .lineTo(summaryX + summaryWidth, totalY - 5)
     .lineWidth(2)
     .strokeColor('#000000')
     .stroke();

  doc.fontSize(18)
     .fillColor('#e22a2a')
     .text('TOTAL', summaryX, totalY, { width: 100, align: 'left' });
  
  doc.fontSize(18)
     .fillColor('#e22a2a')
     .text(`${currencySymbol}${(orderData.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 
           summaryX + 110, totalY, { width: 70, align: 'right' });

  doc.y = totalY + 50;
};

/**
 * Generate signature section matching purchase-details design
 */
const generatePurchaseStyleSignature = (doc, orderData, pageWidth, leftMargin) => {
  const startY = doc.y;
  
  // Authorized Signatory
  doc.moveTo(leftMargin, startY + 50)
     .lineTo(leftMargin + 250, startY + 50)
     .lineWidth(1)
     .strokeColor('#000000')
     .stroke();

  doc.fontSize(14)
     .fillColor('#000000')
     .text('Authorized Signatory', leftMargin, startY + 60);
  
  doc.fontSize(11)
     .fillColor('#6c757d')
     .text('Account Manager', leftMargin, startY + 80);

  doc.y = startY + 120;
};

/**
 * Generate footer section matching purchase-details design
 */
const generatePurchaseStyleFooter = (doc, orderData, pageWidth, leftMargin) => {
  const startY = doc.y;
  
  // Red accent border
  doc.rect(leftMargin, startY, pageWidth, 8)
     .fillAndStroke('#e22a2a', '#e22a2a');

  // Footer text
  doc.fontSize(11)
     .fillColor('#6c757d')
     .text(`INVOICE • Invoice Number: ${orderData.invoiceNumber || orderData.orderNumber}`, 
           leftMargin, startY + 20, { 
             width: pageWidth, 
             align: 'center',
             characterSpacing: 1
           });
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return new Date().toLocaleDateString('en-IN');
  return new Date(date).toLocaleDateString('en-IN');
};

/**
 * Format time for display
 */
const formatTime = (date) => {
  if (!date) return new Date().toLocaleTimeString('en-IN');
  return new Date(date).toLocaleTimeString('en-IN');
};

/**
 * Get currency symbol from admin settings
 */
const getCurrencySymbol = async () => {
  try {
    const axios = require('axios');
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
    
    const response = await axios.get(`${authServiceUrl}/api/auth/currency`);
    
    if (response.data.success && response.data.data?.currency) {
      const currency = response.data.data.currency;
      
      // Get currency symbol using Intl.NumberFormat
      const symbol = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      })
        .formatToParts(0)
        .find(part => part.type === 'currency')?.value || '₹';
      
      return symbol;
    }
  } catch (error) {
    console.error('Error fetching currency symbol:', error);
  }
  
  // Fallback to INR symbol
  return '₹';
};

/**
 * Get company data from database or environment
 */
const getCompanyData = async () => {
  try {
    // Try to get from database first
    const { prisma } = require('../../config/database');
    
    const companySettings = await prisma.companySettings.findFirst();
    
    if (companySettings) {
      return {
        companyName: companySettings.companyName,
        address: companySettings.address,
        city: companySettings.city,
        state: companySettings.state,
        zipCode: companySettings.zipCode,
        country: companySettings.country || 'India',
        phone: companySettings.phone,
        email: companySettings.email,
        website: companySettings.website
      };
    }
  } catch (error) {
    console.error('Error fetching company data from database:', error);
  }

  // Fallback to environment variables or defaults
  return {
    companyName: process.env.COMPANY_NAME || 'Ecommerce Surface',
    address: process.env.COMPANY_ADDRESS || 'Street Address',
    city: process.env.COMPANY_CITY || 'City',
    state: process.env.COMPANY_STATE || 'State',
    zipCode: process.env.COMPANY_ZIP || 'ZIP Code',
    country: process.env.COMPANY_COUNTRY || 'India',
    phone: process.env.COMPANY_PHONE || '+91 1234567890',
    email: process.env.COMPANY_EMAIL || 'contact@company.com',
    website: process.env.COMPANY_WEBSITE || 'www.company.com'
  };
};

/**
 * Get logo data from web settings
 */
const getLogoData = async () => {
  try {
    const { prisma } = require('../../config/database');
    const { getPresignedUrl } = require('../web/uploadsS3');
    
    const webSettings = await prisma.webSettings.findFirst();
    
    console.log('📄 Web settings found:', webSettings ? 'Yes' : 'No');
    
    if (webSettings) {
      let logoUrl = null;
      
      // Try logoUrl first (direct URL)
      if (webSettings.logoUrl) {
        console.log('📄 Using logoUrl from web settings');
        logoUrl = webSettings.logoUrl;
      }
      // Try logoKey (S3 key) if logoUrl not available
      else if (webSettings.logoKey) {
        console.log('📄 Using logoKey from web settings, generating proxy URL');
        logoUrl = getPresignedUrl(webSettings.logoKey, 3600);
      }
      
      console.log('📄 Final logo URL:', logoUrl ? 'Generated' : 'Not available');
      
      if (logoUrl) {
        // Convert URL to base64 for PDF embedding
        const logoBase64 = await urlToBase64(logoUrl);
        console.log('📄 Logo converted to base64:', logoBase64 ? 'Yes' : 'No');
        return logoBase64;
      }
    } else {
      console.log('📄 No web settings found in database');
    }
  } catch (error) {
    console.error('📄 Error fetching logo from web settings:', error);
  }
  
  return null;
};

/**
 * Convert URL to base64
 */
const urlToBase64 = async (url) => {
  try {
    const axios = require('axios');
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const mimeType = response.headers['content-type'] || 'image/png';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return null;
  }
};

module.exports = {
  generateInvoicePDF,
  getCompanyData,
  getLogoData,
  getCurrencySymbol
};

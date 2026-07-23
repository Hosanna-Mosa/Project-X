import mongoose from "mongoose";
import Order, { ServiceType, IOrder } from "../database/models/Order";
import User from "../database/models/User";
import { sendEmail } from "./email.service";

export class InvoiceService {
  private static instance: InvoiceService;

  private constructor() {}

  public static getInstance(): InvoiceService {
    if (!InvoiceService.instance) {
      InvoiceService.instance = new InvoiceService();
    }
    return InvoiceService.instance;
  }

  /**
   * Generates a Google Static Map image URL showing the route
   */
  private getStaticMapUrl(order: any): string {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyD23mZxzw78gBlz6EGEZ6BMgCwc4fygJMA";
    
    const pickupStop = order.stops[0];
    const dropStop = order.stops[order.stops.length - 1];
    
    if (!pickupStop || !dropStop) {
      return "";
    }
    
    const pickupCoords = pickupStop.location?.coordinates || [];
    const dropCoords = dropStop.location?.coordinates || [];
    
    const pickupLng = pickupCoords[0];
    const pickupLat = pickupCoords[1];
    const dropLng = dropCoords[0];
    const dropLat = dropCoords[1];
    
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      return "";
    }


    
    // Choose marker colors depending on Service Type
    let pickupColor = "green";
    let dropColor = "red";
    let pathColor = "0x2563ebff"; // Blue path
    
    if (order.serviceType === ServiceType.DELIVERY) {
      pickupColor = "orange";
      dropColor = "black";
      pathColor = "0xff5200ff"; // Flavour Orange
    } else if (order.serviceType === ServiceType.HELPER) {
      pickupColor = "purple";
      dropColor = "red";
      pathColor = "0x6366f1ff"; // Flavour Tasks Indigo
    } else {
      // Ride
      pickupColor = "green";
      dropColor = "red";
      pathColor = "0x1e1b4bff"; // Flavour Rides Dark
    }

    let pathParam = "";
    if (order.polyline) {
      pathParam = `color:${pathColor}|weight:4|enc:${order.polyline}`;
    } else {
      pathParam = `color:${pathColor}|weight:4|${pickupLat},${pickupLng}|${dropLat},${dropLng}`;
    }

    const markersPickup = `color:${pickupColor}|label:P|${pickupLat},${pickupLng}`;
    const markersDrop = `color:${dropColor}|label:D|${dropLat},${dropLng}`;

    const url = `https://maps.googleapis.com/maps/api/staticmap?size=500x250&scale=2&maptype=roadmap` +
                `&path=${encodeURIComponent(pathParam)}` +
                `&markers=${encodeURIComponent(markersPickup)}` +
                `&markers=${encodeURIComponent(markersDrop)}` +
                `&key=${apiKey}`;
    
    console.log(`[InvoiceService] Generated Static Map URL for order ${order._id}:`, url);
    return url;
  }

  /**
   * Formats a date into a readable string: e.g. "Jun 8th 2026, 6:49 AM"
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const day = d.getDate();
    
    // Add ordinal suffix (st, nd, rd, th)
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";

    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    return `${month} ${day}${suffix} ${year}, ${hours}:${minutes} ${ampm}`;
  }

  /**
   * Helper to convert a number to words for the invoice total
   */
  private numberToWords(num: number): string {
    const a = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const cleanNum = Math.round(num * 100) / 100;
    const parts = cleanNum.toString().split(".");
    const rupees = parseInt(parts[0], 10);
    const paise = parts[1] ? parseInt(parts[1].padEnd(2, "0").substring(0, 2), 10) : 0;

    const translate = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
      if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + translate(n % 100) : "");
      if (n < 100000) return translate(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + translate(n % 1000) : "");
      if (n < 10000000) return translate(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + translate(n % 100000) : "");
      return translate(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + translate(n % 10000000) : "");
    };

    let words = "";
    if (rupees === 0) {
      words = "Zero Rupees";
    } else {
      words = translate(rupees) + " Rupees";
    }

    if (paise > 0) {
      words += " and " + translate(paise) + " Paise";
    }

    return words + " Only";
  }

  /**
   * Compiles the Food Delivery Invoice HTML
   */
  public generateDeliveryInvoiceHtml(order: any): string {
    const dropStop = order.stops.find((s: any) => s.type === "drop") || order.stops[1];
    const itemsList = dropStop?.items?.lines || [];
    const totals = dropStop?.items?.totals || {};

    const orderId = order._id || "222972423858594";
    const dateObj = order.createdAt || new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const random6Digits = Math.floor(100000 + Math.random() * 900000).toString();
    const invoiceNo = `INV${day}${month}${year}${random6Digits}`;
    const dateTime = this.formatDate(dateObj);
    const paymentMethod = order.paymentMethod || "Online (Razorpay)";
    const userName = order.user?.name || "Suman SB";
    const userAddress = dropStop?.address || order.stops[1]?.address || "Unit 1106, TOWER-1, Gachibowli Cir, Telecom Nagar, Gachibowli, Hyderabad, Telangana 500081, India";
    const userPhone = order.user?.phone || "+91 9876543210";
    
    const vendorName = order.vendor?.name || "Rayalaseema Ruchulu";
    const vendorAddress = order.vendor?.address || "22, Sector 1, Huda Techno Enclave, Above Axis Bank, Hitech City";
    const vendorFssai = order.vendor?.fssaiLicense || "13619013001824";
    const vendorGstin = order.vendor?.gstin || "36AAWCA9693G1ZS";

    const subtotal = totals.subtotal || order.totalPrice;
    const taxes = totals.taxes || 0;
    const deliveryFee = totals.deliveryFee || 0;
    const serviceFee = totals.serviceFee || 0;
    const tip = totals.tip || 0;
    const discount = totals.discount || 0;
    const grandTotal = totals.total || order.totalPrice;

    const invoiceTotalWords = this.numberToWords(grandTotal);

    let itemsRowsHtml = "";
    if (itemsList.length > 0) {
      itemsList.forEach((item: any, index: number) => {
        const itemTotal = item.total || (item.price * item.quantity);
        itemsRowsHtml += `
          <tr>
            <td style="text-align: center;">${index + 1}.</td>
            <td>${item.name}</td>
            <td style="text-align: center;">OTH</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${Number(item.price).toFixed(2)}</td>
            <td style="text-align: right;">${Number(itemTotal).toFixed(2)}</td>
            <td style="text-align: right;">0.00</td>
            <td style="text-align: right;">${Number(itemTotal).toFixed(2)}</td>
          </tr>
        `;
      });
    } else {
      // Fallback row if items are empty
      itemsRowsHtml = `
        <tr>
          <td style="text-align: center;">1.</td>
          <td>Food Delivery Order Charge</td>
          <td style="text-align: center;">OTH</td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right;">${Number(subtotal).toFixed(2)}</td>
          <td style="text-align: right;">${Number(subtotal).toFixed(2)}</td>
          <td style="text-align: right;">0.00</td>
          <td style="text-align: right;">${Number(subtotal).toFixed(2)}</td>
        </tr>
      `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - Flavour</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333333; margin: 0; padding: 20px; line-height: 1.4; }
    .invoice-container { width: 750px; margin: 0 auto; background-color: #ffffff; border: 1px solid #cccccc; padding: 20px; box-sizing: border-box; }
    .orange-header { background-color: #ff5200; padding: 15px; text-align: center; margin-bottom: 20px; }
    .logo-text { color: #ffffff; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .title-center { text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 1px; margin-bottom: 25px; text-transform: uppercase; }
    .info-grid { display: table; width: 100%; margin-bottom: 20px; }
    .info-row { display: table-row; }
    .info-col { display: table-cell; width: 50%; vertical-align: top; padding-bottom: 10px; }
    .info-col-inner { padding-right: 15px; }
    .field-label { font-weight: bold; width: 140px; display: inline-block; vertical-align: top; }
    .field-value { display: inline-block; width: calc(100% - 145px); vertical-align: top; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .items-table th, .items-table td { border: 1px solid #000000; padding: 8px 6px; text-align: left; }
    .items-table th { font-weight: bold; background-color: #fcfcfc; }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .subtotal-row td { font-weight: bold; }
    .taxes-container { float: right; width: 300px; margin-bottom: 20px; }
    .taxes-table { width: 100%; border-collapse: collapse; }
    .taxes-table td { padding: 5px 0; font-size: 11px; }
    .taxes-table .bold-text { font-weight: bold; }
    .clear-both { clear: both; }
    .words-box { border: 1px solid #000000; padding: 8px; margin-bottom: 15px; font-weight: bold; }
    .signature-section { border: 1px solid #000000; height: 90px; margin-bottom: 15px; position: relative; }
    .sig-left { width: 50%; height: 100%; border-right: 1px solid #000000; float: left; padding: 8px; box-sizing: border-box; font-weight: bold; }
    .sig-right { width: 50%; height: 100%; float: right; padding: 8px; box-sizing: border-box; text-align: right; }
    .eco-details { border: 1px solid #000000; padding: 10px; text-align: center; line-height: 1.6; }
    .eco-title { font-weight: bold; text-decoration: underline; margin-bottom: 5px; display: block; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="orange-header">
      <div class="logo-text">Flavour</div>
    </div>
    
    <div class="title-center">TAX INVOICE</div>
    
    <div class="info-grid">
      <div class="info-row">
        <div class="info-col">
          <div class="info-col-inner">
            <div style="margin-bottom: 8px;">
              <span class="field-label">Invoice To:</span>
              <span class="field-value">${userName}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span class="field-label">GSTIN:</span>
              <span class="field-value">Unregistered</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span class="field-label">Customer Address:</span>
              <span class="field-value">${userAddress}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span class="field-label">Order ID:</span>
              <span class="field-value">${orderId}</span>
            </div>
          </div>
        </div>
        <div class="info-col">
          <div class="info-col-inner">
            <div style="font-weight: bold; margin-bottom: 8px; line-height: 1.3;">
              Invoice issued by Flavour Limited (formerly known as Flavour Private Limited) on behalf of:
            </div>
            <div style="margin-bottom: 6px;">
              <span class="field-label">Restaurant Name:</span>
              <span class="field-value">${vendorName}</span>
            </div>
            <div style="margin-bottom: 6px;">
              <span class="field-label">Restaurant GSTIN:</span>
              <span class="field-value">${vendorGstin}</span>
            </div>
            <div style="margin-bottom: 6px;">
              <span class="field-label">Restaurant FSSAI License:</span>
              <span class="field-value">${vendorFssai}</span>
            </div>
            <div style="margin-bottom: 6px;">
              <span class="field-label">Address:</span>
              <span class="field-value">${vendorAddress}</span>
            </div>
            <div style="margin-bottom: 6px;">
              <span class="field-label">State:</span>
              <span class="field-value">Telangana</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="info-grid" style="border-top: 1px dashed #cccccc; padding-top: 10px; margin-bottom: 15px;">
      <div class="info-row">
        <div class="info-col" style="width: 50%;">
          <div style="margin-bottom: 6px;"><span class="field-label">Document:</span><span class="field-value">INV</span></div>
          <div style="margin-bottom: 6px;"><span class="field-label">Invoice No:</span><span class="field-value">${invoiceNo}</span></div>
          <div style="margin-bottom: 6px;"><span class="field-label">Date of Invoice:</span><span class="field-value">${dateTime.split(",")[0]}</span></div>
          <div style="margin-bottom: 6px;"><span class="field-label">HSN Code:</span><span class="field-value">996331</span></div>
        </div>
        <div class="info-col" style="width: 50%;">
          <div style="margin-bottom: 6px;"><span class="field-label">Place of Supply:</span><span class="field-value">Telangana</span></div>
          <div style="margin-bottom: 6px;"><span class="field-label">Service Description:</span><span class="field-value">Restaurant Service</span></div>
          <div style="margin-bottom: 6px;"><span class="field-label">Category:</span><span class="field-value">B2C</span></div>
          <div style="margin-bottom: 6px;"><span class="field-label">Reverse Charges Applicable:</span><span class="field-value">No</span></div>
        </div>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 40px;">Sr No</th>
          <th>Description</th>
          <th class="text-center" style="width: 100px;">Unit Of Measure</th>
          <th class="text-center" style="width: 60px;">Quantity</th>
          <th class="text-right" style="width: 80px;">Unit Price</th>
          <th class="text-right" style="width: 80px;">Amount(Rs.)</th>
          <th class="text-right" style="width: 80px;">Discount</th>
          <th class="text-right" style="width: 120px;">Net Assessable Value(Rs.)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRowsHtml}
        <tr class="subtotal-row">
          <td colspan="7" class="text-right" style="border-right: none;">Subtotal</td>
          <td class="text-right" style="border-left: none;">${Number(subtotal).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="taxes-container">
      <table class="taxes-table">
        <tr>
          <td class="bold-text">Taxes</td>
          <td class="bold-text text-center">Rate</td>
          <td></td>
        </tr>
        <tr>
          <td>IGST</td>
          <td class="text-center">0%</td>
          <td class="text-right">0.00</td>
        </tr>
        <tr>
          <td>CGST</td>
          <td class="text-center">2.5%</td>
          <td class="text-right">${Number(taxes / 2).toFixed(2)}</td>
        </tr>
        <tr>
          <td>SGST/UTGST</td>
          <td class="text-center">2.5%</td>
          <td class="text-right">${Number(taxes / 2).toFixed(2)}</td>
        </tr>
        <tr style="border-top: 1px solid #cccccc; border-bottom: 1px solid #cccccc;">
          <td class="bold-text">Total taxes</td>
          <td></td>
          <td class="bold-text text-right">${Number(taxes).toFixed(2)}</td>
        </tr>
        ${deliveryFee > 0 ? `
        <tr>
          <td>Delivery Fee</td>
          <td></td>
          <td class="text-right">${Number(deliveryFee).toFixed(2)}</td>
        </tr>
        ` : ''}
        ${serviceFee > 0 ? `
        <tr>
          <td>Platform Fee</td>
          <td></td>
          <td class="text-right">${Number(serviceFee).toFixed(2)}</td>
        </tr>
        ` : ''}
        ${tip > 0 ? `
        <tr>
          <td>Driver Tip</td>
          <td></td>
          <td class="text-right">${Number(tip).toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr style="font-size: 13px;">
          <td class="bold-text" style="padding-top: 8px;">Invoice Total</td>
          <td></td>
          <td class="bold-text text-right" style="padding-top: 8px; font-size: 13px;">${Number(grandTotal).toFixed(2)}</td>
        </tr>
      </table>
    </div>
    
    <div class="clear-both"></div>
    
    <div class="words-box">
      Invoice total in words: ${invoiceTotalWords}
    </div>
    
    <div class="signature-section">
      <div class="sig-left">
        Authorized Signature
      </div>
      <div class="sig-right">
        <span style="font-size: 9px; color: #666666; display: block; margin-top: 25px;">
          Digitally Signed by<br/>
          <strong>Flavour Limited</strong><br/>
          ${dateTime.split(",")[0]}
        </span>
      </div>
    </div>
    
    <div class="eco-details">
      <span class="eco-title">Details of ECO under GST</span>
      Name: Flavour Limited (formerly known as Flavour Private Limited)<br/>
      Address: Plot No.131 Block B, Dwaraka Icon Sy No. 43/P, 44/P, 45, and 48, Kavuri Hills, Guttala Begumpet, Ranga Reddy District, Hyderabad, Telangana-500033<br/>
      GSTIN: 36AAFCB7707D1ZV &nbsp;&nbsp;|&nbsp;&nbsp; Flavour FSSAI: 10016043001588
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Compiles the Ride Share (3-page replica) Invoice HTML
   */
  public generateRideInvoiceHtml(order: any): string {
    const orderId = order._id || "RD17808812185935874";
    const staticMapUrl = this.getStaticMapUrl(order);
    const dateTime = this.formatDate(order.createdAt || new Date());
    const paymentMethod = order.paymentMethod || "Cash";
    const totalPrice = order.totalPrice || 20.00;
    
    const userName = order.user?.name || "Uttej Yadala";
    const pickupAddress = order.stops[0]?.address || "RK Beach, Beach Road, Visakhapatnam, Andhra Pradesh, India";
    const dropAddress = order.stops[1]?.address || "15-3-17, Krishna Nagar, Maharani Peta, Visakhapatnam, Andhra Pradesh 530002, India";
    
    const driverName = order.driver?.name || "Dinesh Nidadavolu";
    const vehicleNumber = order.driver?.vehicleNumber || "AP39RN7856";
    const distance = order.totalDistance || 0.39;
    const duration = order.duration || 1.98;

    // Platform Fee: Fixed ₹7.00 for fares > 15, otherwise ₹3.00
    const platformFee = totalPrice > 15 ? 7.00 : 3.00;
    const rideCharge = totalPrice - platformFee;

    // Ride Charge tax breakdown (5% GST included)
    const netFare = Math.round((rideCharge / 1.05) * 100) / 100;
    const rideGst = Math.round((rideCharge - netFare) * 100) / 100;
    const rideCgstSgst = Math.round((rideGst / 2) * 100) / 100;

    // Platform Fee tax breakdown (18% GST included)
    const subTotalPlatform = Math.round((platformFee / 1.18) * 100) / 100;
    const convenienceGst = Math.round((platformFee - subTotalPlatform) * 100) / 100;
    const convenienceCgstSgst = Math.round((convenienceGst / 2) * 100) / 100;

    // Split Booking Fee (₹1.00) and Convenience Charges
    const bookingFee = 1.00;
    const convenienceCharges = Math.round((subTotalPlatform - bookingFee) * 100) / 100;

    const dateObj = order.createdAt || new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const random6Digits = Math.floor(100000 + Math.random() * 900000).toString();
    const invoiceNo = `INV${day}${month}${year}${random6Digits}`;
    const platformInvoiceNo = `INV${day}${month}${year}${Math.floor(100000 + Math.random() * 900000).toString()}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ride Invoice - Flavour Rides</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333333; margin: 0; padding: 20px; line-height: 1.4; }
    .page-container { width: 620px; margin: 0 auto 30px auto; background-color: #ffffff; border: 1px solid #dddddd; padding: 30px; box-sizing: border-box; }
    .header-table { width: 100%; margin-bottom: 20px; }
    .logo-text { color: #0f172a; font-size: 20px; font-weight: bold; text-align: right; text-transform: uppercase; }
    .logo-subtext { color: #f59e0b; font-size: 10px; text-align: right; font-weight: bold; }
    .page-title { font-size: 16px; font-weight: bold; margin: 0; }
    .ride-id-text { font-size: 10px; color: #666666; margin-top: 5px; }
    .summary-section { text-align: center; margin: 20px 0; }
    .total-title { font-size: 12px; color: #666666; margin-bottom: 5px; }
    .total-amount { font-size: 26px; font-weight: bold; color: #000000; }
    .map-mock { border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 10px; background-color: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
    .map-placeholder { width: 65%; height: 120px; background: linear-gradient(45deg, #e2e8f0 25%, #cbd5e1 25%, #cbd5e1 50%, #e2e8f0 50%, #e2e8f0 75%, #cbd5e1 75%, #cbd5e1 100%); background-size: 40px 40px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #475569; font-weight: bold; border: 1px solid #cbd5e1; }
    .metrics-col { width: 30%; text-align: center; }
    .metric-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
    .metric-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .address-list { margin: 20px 0; padding-left: 15px; border-left: 2px solid #cbd5e1; }
    .address-item { position: relative; margin-bottom: 15px; padding-left: 10px; }
    .address-item:last-child { margin-bottom: 0; }
    .address-item::before { content: ''; position: absolute; left: -15px; top: 3px; width: 8px; height: 8px; border-radius: 50%; }
    .address-item.pickup::before { background-color: #22c55e; }
    .address-item.drop::before { background-color: #ef4444; }
    .section-title { font-size: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 25px 0 10px 0; }
    .bill-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 11px; }
    .bill-row.total { font-weight: bold; border-top: 1px solid #e2e8f0; margin-top: 5px; padding-top: 8px; font-size: 12px; }
    .table-details { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .table-details td { padding: 6px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .table-details td.label-col { color: #666666; width: 40%; }
    .table-details td.val-col { font-weight: bold; text-align: right; }
    .legal-footer { font-size: 9px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
    .provider-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .provider-info { width: 60%; line-height: 1.4; }
    .qr-container { width: 80px; height: 80px; background-color: #eeeeee; border: 1px solid #cccccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #666666; text-align: center; }
  </style>
</head>
<body>

  <!-- PAGE 1: Payment Summary -->
  <div class="page-container">
    <table class="header-table">
      <tr>
        <td>
          <h1 class="page-title">Payment Summary</h1>
          <div class="ride-id-text">Ride ID: ${orderId}</div>
          <div class="ride-id-text">Time of Ride: ${dateTime}</div>
        </td>
        <td>
          <div class="logo-text">Flavour Rides</div>
          <div class="logo-subtext">FLAVOUR GROUP</div>
        </td>
      </tr>
    </table>

    <div class="summary-section">
      <div class="total-title">Total</div>
      <div class="total-amount">₹ ${Number(totalPrice).toFixed(2)}</div>
    </div>

    <div class="map-mock">
      <div class="map-placeholder" style="background-image: url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=500&q=80'); background-size: cover; background-position: center; padding: 0; position: relative;">
        <img src="${staticMapUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; position: absolute; top: 0; left: 0;" alt="" />
      </div>
      <div class="metrics-col">
        <div class="metric-value">${Number(distance).toFixed(2)} kms</div>
        <div class="metric-label">Distance</div>
        <div class="metric-value">${Number(duration).toFixed(2)} mins</div>
        <div class="metric-label">Duration</div>
      </div>
    </div>

    <div class="address-list">
      <div class="address-item pickup">
        <strong>Pickup:</strong> ${pickupAddress}
      </div>
      <div class="address-item drop">
        <strong>Drop:</strong> ${dropAddress}
      </div>
    </div>

    <div class="section-title">Bill Details</div>
    <div class="bill-row">
      <span>Ride Charge</span>
      <span>₹ ${Number(rideCharge).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>Booking Fees & Convenience Charges</span>
      <span>₹ ${Number(platformFee).toFixed(2)}</span>
    </div>
    <div class="bill-row total">
      <span>Total Amount</span>
      <span>₹ ${Number(totalPrice).toFixed(2)}</span>
    </div>
    <div style="font-size: 9px; color: #94a3b8; text-align: right; margin-top: 2px;">(Inclusive of Taxes)</div>

    <div class="section-title">You Paid Using</div>
    <div class="bill-row">
      <span>${paymentMethod}</span>
      <span>₹ ${Number(totalPrice).toFixed(2)}</span>
    </div>
  </div>


  <!-- PAGE 2: Driver Tax Invoice (Ride Charge) -->
  <div class="page-container">
    <table class="header-table">
      <tr>
        <td>
          <h1 class="page-title">Tax Invoice</h1>
          <div class="ride-id-text">Ride ID: ${orderId}</div>
        </td>
        <td>
          <div class="logo-text">Flavour Rides</div>
          <div class="logo-subtext">FLAVOUR GROUP</div>
        </td>
      </tr>
    </table>

    <table class="table-details">
      <tr>
        <td class="label-col">Invoice No.</td>
        <td class="val-col">${invoiceNo}</td>
      </tr>
      <tr>
        <td class="label-col">Invoice Date</td>
        <td class="val-col">${dateTime}</td>
      </tr>
      <tr>
        <td class="label-col">State</td>
        <td class="val-col">Andhra Pradesh</td>
      </tr>
      <tr>
        <td class="label-col">Tax Category</td>
        <td class="val-col" style="font-size: 10px;">Other local transportation services of passengers n.e.c. (996419)</td>
      </tr>
      <tr>
        <td class="label-col">Place of Supply</td>
        <td class="val-col">Andhra Pradesh</td>
      </tr>
      <tr>
        <td class="label-col">GST Number</td>
        <td class="val-col">37AAHCR1710J1ZF</td>
      </tr>
      <tr>
        <td class="label-col">Vehicle Number</td>
        <td class="val-col">${vehicleNumber}</td>
      </tr>
      <tr>
        <td class="label-col">Captain Name</td>
        <td class="val-col">${driverName}</td>
      </tr>
      <tr>
        <td class="label-col">Customer Name</td>
        <td class="val-col">${userName}</td>
      </tr>
      <tr>
        <td class="label-col">Customer Pick Up Address</td>
        <td class="val-col" style="font-weight: normal; font-size: 10px;">${pickupAddress}</td>
      </tr>
    </table>

    <div class="section-title">Bill Details</div>
    <div class="bill-row">
      <span>Captain Fee</span>
      <span>₹ ${Number(netFare).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>CGST (2.5%)</span>
      <span>₹ ${Number(rideCgstSgst).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>SGST (2.5%)</span>
      <span>₹ ${Number(rideCgstSgst).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>IGST (0%)</span>
      <span>₹ 0.00</span>
    </div>
    <div class="bill-row total">
      <span>Ride Charge</span>
      <span>₹ ${Number(rideCharge).toFixed(2)}</span>
    </div>
    <div style="font-size: 9px; color: #94a3b8; text-align: right; margin-top: 2px;">(Inclusive of Taxes)</div>

    <div class="legal-footer">
      This document is issued by Transport Service Provider and not by Flavour Private Limited (Flavour Rides). Flavour Rides acts only as an Electronic Commerce Operator for the transportation services.
    </div>
  </div>


  <!-- PAGE 3: Platform Tax Invoice (Booking & Convenience Fee) -->
  <div class="page-container">
    <table class="header-table">
      <tr>
        <td>
          <h1 class="page-title">Tax Invoice</h1>
          <div class="ride-id-text">Ride ID: ${orderId}</div>
        </td>
        <td>
          <div class="logo-text">Flavour Rides</div>
          <div class="logo-subtext">FLAVOUR GROUP</div>
        </td>
      </tr>
    </table>

    <div class="provider-section">
      <div class="provider-info">
        <strong>Flavour Private Limited</strong><br/>
        D No 48-11-2-10 A, Shakamuri Shivayya Street,<br/>
        Currency Nagar, Vijaywada, Andhra Pradesh, 520008
      </div>
      <div class="qr-container" style="display: flex; align-items: center; justify-content: center; background-color: #ffffff; border: 1px solid #cbd5e1; width: 80px; height: 80px; box-sizing: border-box;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(orderId)}" style="width: 70px; height: 70px; display: block;" alt="QR Code" />
      </div>
    </div>

    <div style="margin-bottom: 20px; line-height: 1.4;">
      <strong>Bill To:</strong><br/>
      ${userName}<br/>
      ${pickupAddress}
    </div>

    <table class="table-details">
      <tr>
        <td class="label-col">Invoice No.</td>
        <td class="val-col">${platformInvoiceNo}</td>
      </tr>
      <tr>
        <td class="label-col">Invoice Date</td>
        <td class="val-col">${dateTime}</td>
      </tr>
      <tr>
        <td class="label-col">Tax Category</td>
        <td class="val-col">Other services n.e.c. (999799)</td>
      </tr>
      <tr>
        <td class="label-col">Place of Supply</td>
        <td class="val-col">Andhra Pradesh</td>
      </tr>
      <tr>
        <td class="label-col">GST</td>
        <td class="val-col">37AAHCR1710J1ZF</td>
      </tr>
    </table>

    <div class="section-title">Bill Details</div>
    <div class="bill-row">
      <span>Booking Fee</span>
      <span>₹ ${Number(bookingFee).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>Convenience Charges</span>
      <span>₹ ${Number(convenienceCharges).toFixed(2)}</span>
    </div>
    <div class="bill-row" style="font-weight: bold; border-top: 1px solid #f1f5f9; padding-top: 4px; margin-top: 4px;">
      <span>Sub Total</span>
      <span>₹ ${Number(subTotalPlatform).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>CGST (9%)</span>
      <span>₹ ${Number(convenienceCgstSgst).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>SGST (9%)</span>
      <span>₹ ${Number(convenienceCgstSgst).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>IGST (0%)</span>
      <span>₹ 0.00</span>
    </div>
    <div class="bill-row total">
      <span>Final Amount</span>
      <span>₹ ${Number(platformFee).toFixed(2)}</span>
    </div>
    <div style="font-size: 9px; color: #94a3b8; text-align: right; margin-top: 2px;">(Inclusive of Taxes)</div>

    <div class="legal-footer">
      This is a system generated invoice and hence no signature required.<br/>
      Thank you ${userName}
    </div>
  </div>

</body>
</html>`;
  }

  /**
   * Helper to generate PDF binary from HTML string using local Google Chrome instance
   */
  private async generatePdfFromHtml(html: string): Promise<Buffer> {
    const puppeteer = require("puppeteer-core");
    const browser = await puppeteer.launch({
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
      });
      return pdf;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generates email body HTML matching the Swiggy delivery confirmation layout
   */
  public generateDeliveryEmailHtml(order: any): string {
    const dropStop = order.stops.find((s: any) => s.type === "drop") || order.stops[1];
    const itemsList = dropStop?.items?.lines || [];
    const totals = dropStop?.items?.totals || {};

    const orderId = order._id || "";
    const staticMapUrl = this.getStaticMapUrl(order);
    const orderPlacedAt = this.formatDate(order.createdAt || new Date());
    const orderDeliveredAt = this.formatDate(order.updatedAt || new Date());
    const duration = order.duration || 45; // minutes
    
    const userName = order.user?.name || "Customer";
    const userAddress = dropStop?.address || order.stops[1]?.address || "";
    
    const vendorName = order.vendor?.name || "Restaurant";
    const vendorAddress = order.vendor?.address || "";

    const subtotal = totals.subtotal || order.totalPrice;
    const taxes = totals.taxes || 0;
    const deliveryFee = totals.deliveryFee || 0;
    const serviceFee = totals.serviceFee || 0;
    const tip = totals.tip || 0;
    const discount = totals.discount || 0;
    const grandTotal = totals.total || order.totalPrice;
    const paymentMethod = order.paymentMethod || "Razorpay";

    let itemsRowsHtml = "";
    itemsList.forEach((item: any) => {
      itemsRowsHtml += `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 10px 0; text-align: left; font-size: 13px;">${item.name}</td>
          <td style="padding: 10px 0; text-align: center; font-size: 13px;">${item.quantity}</td>
          <td style="padding: 10px 0; text-align: right; font-size: 13px;">₹ ${Number(item.price * item.quantity).toFixed(0)}</td>
        </tr>
      `;
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px; color: #374151; margin: 0; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .email-header { background-color: #ff5200; padding: 25px; text-align: center; }
    .email-header-logo { color: white; font-size: 24px; font-weight: bold; letter-spacing: 1px; }
    .email-body { padding: 30px; line-height: 1.6; }
    .greeting-text { font-size: 14px; margin-bottom: 20px; }
    .order-info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .order-info-table td { padding: 6px 0; font-size: 13px; }
    .table-title { font-size: 15px; font-weight: bold; color: #111827; margin: 25px 0 10px 0; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .items-table th { border-bottom: 2px solid #e5e7eb; padding: 10px 0; font-size: 12px; font-weight: bold; color: #9ca3af; text-transform: uppercase; }
    .summary-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .summary-table td { padding: 6px 0; font-size: 13px; color: #4b5563; }
    .summary-table .total-row td { font-size: 15px; font-weight: bold; color: #ff5200; border-top: 1px dashed #e5e7eb; padding-top: 12px; margin-top: 8px; }
    .disclaimer { font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; line-height: 1.5; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; }
    
    .map-container { width: 280px; height: 120px; border: 1px solid #e2e8f0; border-radius: 4px; margin: 15px 0; overflow: hidden; position: relative; }
    .map-bg { width: 100%; height: 100%; background: radial-gradient(circle at 30% 20%, #e2e8f0 10%, transparent 11%), radial-gradient(circle at 80% 70%, #cbd5e1 8%, transparent 9%), #f1f5f9; position: relative; }
    .road-1 { position: absolute; top: 45px; left: 0; width: 100%; height: 10px; background-color: #ffffff; transform: rotate(-5deg); }
    .road-2 { position: absolute; top: 0; left: 160px; width: 10px; height: 100%; background-color: #ffffff; transform: rotate(15deg); }
    
    .pin-restaurant { position: absolute; left: 60px; top: 75px; width: 20px; height: 20px; background-color: #ff5200; border: 2px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .pin-restaurant-inner { width: 6px; height: 6px; background-color: white; border-radius: 50%; }
    .pin-restaurant-label { position: absolute; left: 82px; top: 82px; background-color: #ff5200; color: white; padding: 2px 6px; font-size: 8px; border-radius: 4px; font-weight: bold; }
    
    .pin-drop { position: absolute; left: 180px; top: 30px; width: 20px; height: 20px; background-color: #1f2937; border: 2px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .pin-drop-inner { width: 6px; height: 6px; background-color: white; border-radius: 50%; }
    .pin-drop-label { position: absolute; left: 202px; top: 37px; background-color: #1f2937; color: white; padding: 2px 6px; font-size: 8px; border-radius: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="email-header-logo">FLAVOUR</div>
    </div>
    <div class="email-body">
      <div class="greeting-text">
        Greetings from Flavour,<br/>
        Your order was delivered in ${duration} minutes! Rate this timely delivery <a href="#" style="color: #ff5200; text-decoration: none; font-weight: bold;">here</a>
      </div>
      
      <table class="order-info-table">
        <tr>
          <td style="width: 35%;"><strong>Order No:</strong></td>
          <td>${orderId}</td>
        </tr>
        <tr>
          <td><strong>Restaurant:</strong></td>
          <td><strong>${vendorName}</strong></td>
        </tr>
      </table>

      <!-- Real Time Route Map -->
      ${staticMapUrl ? `
      <div style="margin: 15px 0; max-width: 280px; height: 120px; background-image: url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=500&q=80'); background-size: cover; background-position: center; border-radius: 4px; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
        <img src="${staticMapUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; position: absolute; top: 0; left: 0; display: block;" alt="" />
      </div>
      ` : ''}

      <div class="table-title">Your Order Summary:</div>
      <table class="order-info-table">
        <tr>
          <td style="width: 35%;">Order No:</td>
          <td><strong>${orderId}</strong></td>
        </tr>
        <tr>
          <td>Order placed at:</td>
          <td><strong>${orderPlacedAt}</strong></td>
        </tr>
        <tr>
          <td>Order delivered at:</td>
          <td><strong>${orderDeliveredAt}</strong></td>
        </tr>
        <tr>
          <td>Order Status:</td>
          <td><strong>Delivered</strong></td>
        </tr>
      </table>

      <div class="table-title">Ordered from:</div>
      <div style="font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
        <strong>${vendorName}</strong><br/>
        ${vendorAddress}
      </div>

      <div class="table-title">Delivery To:</div>
      <div style="font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
        <strong>${userName}</strong><br/>
        ${userAddress}
      </div>

      <div class="table-title">Items Ordered</div>
      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align: left;">Item Name</th>
            <th style="text-align: center; width: 60px;">Quantity</th>
            <th style="text-align: right; width: 100px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>

      <table class="summary-table">
        <tr>
          <td>Item Total:</td>
          <td style="text-align: right;">₹ ${Number(subtotal).toFixed(2)}</td>
        </tr>
        ${taxes > 0 ? `
        <tr>
          <td>Restaurant Taxes:</td>
          <td style="text-align: right;">₹ ${Number(taxes).toFixed(2)}</td>
        </tr>
        ` : ''}
        ${deliveryFee > 0 ? `
        <tr>
          <td>Delivery Fee:</td>
          <td style="text-align: right;">₹ ${Number(deliveryFee).toFixed(2)}</td>
        </tr>
        ` : `
        <tr>
          <td>Delivery Fee (FREE with Flavour One):</td>
          <td style="text-align: right; color: #16a34a; font-weight: bold;">FREE</td>
        </tr>
        `}
        ${serviceFee > 0 ? `
        <tr>
          <td>Platform Fee:</td>
          <td style="text-align: right;">₹ ${Number(serviceFee).toFixed(2)}</td>
        </tr>
        ` : ''}
        ${tip > 0 ? `
        <tr>
          <td>Driver Tip:</td>
          <td style="text-align: right;">₹ ${Number(tip).toFixed(2)}</td>
        </tr>
        ` : ''}
        ${discount > 0 ? `
        <tr style="color: #16a34a;">
          <td>Extra discount (with Flavour One):</td>
          <td style="text-align: right;">-₹ ${Number(discount).toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr>
          <td>Paid Via ${paymentMethod}:</td>
          <td style="text-align: right;">₹ ${Number(grandTotal).toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td>Order Total:</td>
          <td style="text-align: right;">₹ ${Number(grandTotal).toFixed(2)}</td>
        </tr>
      </table>

      <div style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 20px;">
        The link to rate your delivery experience is only valid for mobile devices.
      </div>

      <div class="disclaimer">
        <strong>Disclaimer:</strong> Attached is the invoice for the restaurant services provided by the outlet. For items not covered in the attached invoice, the outlet shall be responsible to issue an invoice directly to you.
      </div>
    </div>
    <div class="footer">
      Get the App: iOS | Android &nbsp;&nbsp;|&nbsp;&nbsp; Follow us: Facebook | Twitter<br/><br/>
      &copy; 2026 Flavour. All rights reserved.<br/>
      Ground Floor, Embassy Tech Village, Outer Ring Rd, Devarabisanahalli, Varthur, Bengaluru, Karnataka - 560103
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generates email body HTML matching the Rapido trip confirmation layout
   */
  public generateRideEmailHtml(order: any): string {
    const orderId = order._id || "";
    const staticMapUrl = this.getStaticMapUrl(order);
    const dateTime = this.formatDate(order.createdAt || new Date());
    const paymentMethod = order.paymentMethod || "Cash";
    const totalPrice = order.totalPrice || 0;
    
    const pickupAddress = order.stops[0]?.address || "";
    const dropAddress = order.stops[1]?.address || "";
    
    const distance = order.totalDistance || 0;
    const duration = order.duration || 0;

    const platformFee = totalPrice > 15 ? 7.00 : 3.00;
    const rideCharge = totalPrice - platformFee;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #ffffff; padding: 0; color: #000000; margin: 0; }
    .email-container { width: 100%; max-width: 500px; padding: 15px; box-sizing: border-box; background-color: #ffffff; }
    .summary-title { font-size: 11px; color: #888888; margin-bottom: 6px; }
    .brand-header { font-size: 20px; font-weight: bold; margin-bottom: 20px; font-family: Arial, sans-serif; color: #000000; }
    .brand-yellow { color: #fbc02d; }
    .label-gray { font-size: 11px; color: #888888; margin-top: 12px; margin-bottom: 2px; }
    .value-bold { font-size: 13px; font-weight: bold; color: #000000; margin-bottom: 12px; }
    .total-bold { font-size: 16px; font-weight: bold; color: #000000; }
    
    .map-container { width: 280px; height: 120px; border: 1px solid #e2e8f0; border-radius: 4px; margin: 15px 0; overflow: hidden; position: relative; }
    .map-bg { width: 100%; height: 100%; background: radial-gradient(circle at 30% 20%, #e2e8f0 10%, transparent 11%), radial-gradient(circle at 80% 70%, #cbd5e1 8%, transparent 9%), #f1f5f9; position: relative; }
    .road-1 { position: absolute; top: 40px; left: 0; width: 100%; height: 12px; background-color: #ffffff; transform: rotate(-5deg); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
    .road-2 { position: absolute; top: 0; left: 180px; width: 12px; height: 100%; background-color: #ffffff; transform: rotate(15deg); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
    
    .pin-pickup { position: absolute; left: 50px; top: 75px; width: 20px; height: 20px; background-color: #22c55e; border: 2px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .pin-pickup-inner { width: 6px; height: 6px; background-color: white; border-radius: 50%; }
    .pin-pickup-label { position: absolute; left: 75px; top: 82px; background-color: #1e293b; color: white; padding: 2px 6px; font-size: 8px; border-radius: 4px; font-weight: bold; }
    
    .pin-drop { position: absolute; left: 200px; top: 30px; width: 20px; height: 20px; background-color: #ef4444; border: 2px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .pin-drop-inner { width: 6px; height: 6px; background-color: white; border-radius: 50%; }
    .pin-drop-label { position: absolute; left: 225px; top: 37px; background-color: #1e293b; color: white; padding: 2px 6px; font-size: 8px; border-radius: 4px; font-weight: bold; }
    
    .metric-title { font-size: 13px; font-weight: bold; color: #000000; margin-bottom: 2px; }
    .metric-sub { font-size: 9px; color: #888888; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px; }
    
    .location-timeline { margin: 15px 0; font-size: 12px; line-height: 1.5; max-width: 400px; }
    .location-row { display: flex; align-items: flex-start; margin-bottom: 12px; }
    .dot-pickup { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #22c55e; margin-right: 8px; margin-top: 5px; flex-shrink: 0; }
    .dot-drop { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #ef4444; margin-right: 8px; margin-top: 5px; flex-shrink: 0; }
    
    .bill-section-title { font-size: 14px; font-weight: bold; margin-top: 25px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; max-width: 400px; }
    .bill-table { width: 100%; max-width: 400px; border-collapse: collapse; margin-bottom: 15px; }
    .bill-table td { padding: 6px 0; font-size: 13px; }
    
    .promo-banner { background-color: #ffd600; border-radius: 8px; color: #000000; padding: 20px; display: flex; align-items: center; justify-content: space-between; overflow: hidden; position: relative; margin-top: 25px; max-width: 450px; }
    .promo-left { width: 60%; z-index: 2; }
    .promo-right { width: 35%; height: 80px; position: relative; z-index: 1; }
    .promo-cab { position: absolute; right: 0; bottom: 10px; width: 110px; height: 50px; background-color: #ffffff; border-radius: 10px 20px 6px 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-bottom: 3px solid #111827; }
    .promo-cab-window-1 { position: absolute; left: 12px; top: 6px; width: 30px; height: 16px; background-color: #111827; border-radius: 5px 2px 0 0; }
    .promo-cab-window-2 { position: absolute; left: 47px; top: 6px; width: 35px; height: 16px; background-color: #111827; border-radius: 2px 12px 0 0; }
    .promo-cab-wheel-1 { position: absolute; left: 15px; bottom: -6px; width: 20px; height: 20px; background-color: #111827; border-radius: 50%; border: 2.5px solid #ffd600; }
    .promo-cab-wheel-2 { position: absolute; right: 15px; bottom: -6px; width: 20px; height: 20px; background-color: #111827; border-radius: 50%; border: 2.5px solid #ffd600; }
    .promo-cab-decal { position: absolute; left: 5px; top: 26px; right: 5px; height: 5px; background-color: #ffd600; border-radius: 1px; font-size: 4px; color: black; font-weight: bold; text-align: center; line-height: 5px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="summary-title">Payment Summary</div>
    <div class="brand-header">
      flavour<span class="brand-yellow">rides</span>
    </div>
    
    <div>
      <div class="label-gray">Ride ID</div>
      <div class="value-bold">${orderId}</div>
      
      <div class="label-gray">Time of Ride</div>
      <div class="value-bold">${dateTime}</div>
      
      <div class="label-gray">Total</div>
      <div class="total-bold">₹ ${Number(totalPrice).toFixed(2)}</div>
    </div>

    <!-- Map Container -->
    ${staticMapUrl ? `
    <div style="margin: 15px 0; max-width: 280px; height: 120px; background-image: url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=500&q=80'); background-size: cover; background-position: center; border-radius: 4px; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
      <img src="${staticMapUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; position: absolute; top: 0; left: 0; display: block;" alt="" />
    </div>
    ` : ''}

    <div>
      <div class="metric-title">${Number(distance).toFixed(2)} kms</div>
      <div class="metric-sub">DISTANCE</div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0; width: 280px;" />
      
      <div class="metric-title">${Number(duration).toFixed(2)} mins</div>
      <div class="metric-sub">DURATION</div>
    </div>

    <!-- Route Timeline -->
    <div class="location-timeline">
      <div class="location-row">
        <span class="dot-pickup"></span>
        <span>${pickupAddress}</span>
      </div>
      <div class="location-row">
        <span class="dot-drop"></span>
        <span>${dropAddress}</span>
      </div>
    </div>

    <!-- Bill Details -->
    <div>
      <div class="bill-section-title">Bill Details</div>
      
      <table class="bill-table">
        <tr>
          <td style="padding: 6px 0; color: #555555;">Ride Charge</td>
          <td style="padding: 6px 0; text-align: right; font-weight: bold;">₹ ${Number(rideCharge).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #555555;">Booking Fees & Convenience Charges</td>
          <td style="padding: 6px 0; text-align: right; font-weight: bold;">₹ ${Number(platformFee).toFixed(2)}</td>
        </tr>
        <tr style="border-top: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; font-weight: bold;">Total Amount</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px;">₹ ${Number(totalPrice).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="2" style="font-size: 10px; color: #888888; padding-bottom: 12px;">(Inclusive of Taxes)</td>
        </tr>
        <tr style="border-top: 1px dashed #cbd5e1;">
          <td style="padding: 8px 0; font-weight: bold;">You Paid Using</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #555555; font-size: 12px;">${paymentMethod}</td>
          <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #16a34a; font-size: 13px;">₹ ${Number(totalPrice).toFixed(2)}</td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>
    `;
  }

  /**
   * Main dispatch method called when an order is completed
   */
  public async sendInvoice(orderId: string): Promise<boolean> {
    try {
      const order = await Order.findById(orderId)
        .populate("user")
        .populate({
          path: "driver",
          populate: { path: "user" }
        })
        .populate("vendor");

      if (!order) {
        console.error(`[InvoiceService] Order not found: ${orderId}`);
        return false;
      }

      const user = order.user as any;
      if (!user || !user.email) {
        console.warn(`[InvoiceService] Skip sending invoice: Customer has no email address for Order ID ${orderId}`);
        return false;
      }

      // 1. Generate appropriate layouts, filenames, and subjects depending on service type
      let invoiceHtml = "";
      let emailBodyHtml = "";
      let subject = "";
      let filename = "";

      if (order.serviceType === ServiceType.DELIVERY) {
        invoiceHtml = this.generateDeliveryInvoiceHtml(order);
        emailBodyHtml = this.generateDeliveryEmailHtml(order);
        subject = `Your Flavour Tax Invoice for Order #${orderId}`;
        filename = `Flavour_Tax_Invoice_${orderId}.pdf`;
      } else if (order.serviceType === ServiceType.HELPER) {
        invoiceHtml = this.generateTaskInvoiceHtml(order);
        emailBodyHtml = this.generateTaskEmailHtml(order);
        subject = `Your Flavour Task Summary for Task #${orderId}`;
        filename = `Flavour_Task_Invoice_${orderId}.pdf`;
      } else {
        invoiceHtml = this.generateRideInvoiceHtml(order);
        emailBodyHtml = this.generateRideEmailHtml(order);
        subject = `Your Flavour Ride Invoice for Trip #${orderId}`;
        filename = `Ride_Invoice_${orderId}.pdf`;
      }

      // 2. Convert to PDF using Puppeteer-core
      console.log(`[InvoiceService] Rendering invoice HTML to PDF for order ${orderId}...`);
      const pdfBuffer = await this.generatePdfFromHtml(invoiceHtml);

      await sendEmail({
        to: user.email,
        subject,
        html: emailBodyHtml,
        attachments: [
          {
            filename,
            content: pdfBuffer,
            contentType: "application/pdf"
          }
        ]
      });

      console.log(`[InvoiceService] Invoice successfully sent to ${user.email} for order ${orderId} with PDF attached`);
      return true;
    } catch (error) {
      console.error("[InvoiceService] Error generating or sending invoice:", error);
      return false;
    }
  }

  /**
   * Generates PDF HTML for helper/task booking invoice (with Indigo branding and Total Hours Taken)
   */
  public generateTaskInvoiceHtml(order: any): string {
    const orderId = order._id || "";
    const staticMapUrl = this.getStaticMapUrl(order);
    const dateTime = this.formatDate(order.createdAt || new Date());
    const paymentMethod = order.paymentMethod || "Cash";
    const totalPrice = order.totalPrice || 0;
    
    const userName = order.user?.name || "Customer";
    const pickupAddress = order.stops[0]?.address || "Pickup Location";
    const dropAddress = order.stops[1]?.address || "Dropoff Location";
    
    const driverName = order.driver?.user?.name || order.driver?.name || "Helper Agent";
    const distance = order.totalDistance || 0;
    const hours = order.duration || 2.5; // represented as hours

    // Platform Fee: Fixed ₹7.00 for tasks > 15, otherwise ₹3.00
    const platformFee = totalPrice > 15 ? 7.00 : 3.00;
    const taskCharge = totalPrice - platformFee;

    // Task Charge tax breakdown (18% GST included)
    const netFare = Math.round((taskCharge / 1.18) * 100) / 100;
    const taskGst = Math.round((taskCharge - netFare) * 100) / 100;
    const taskCgstSgst = Math.round((taskGst / 2) * 100) / 100;

    // Platform Fee tax breakdown (18% GST included)
    const subTotalPlatform = Math.round((platformFee / 1.18) * 100) / 100;
    const convenienceGst = Math.round((platformFee - subTotalPlatform) * 100) / 100;
    const convenienceCgstSgst = Math.round((convenienceGst / 2) * 100) / 100;

    // Split Booking Fee (₹1.00) and Convenience Charges
    const bookingFee = 1.00;
    const convenienceCharges = Math.round((subTotalPlatform - bookingFee) * 100) / 100;

    const invoiceNo = `2627TD00126${orderId.slice(-5)}`;
    const platformInvoiceNo = `2627FP00126${orderId.slice(-5)}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Task Invoice - Flavour Tasks</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333333; margin: 0; padding: 20px; line-height: 1.4; }
    .page-container { width: 620px; margin: 0 auto 30px auto; background-color: #ffffff; border: 1px solid #dddddd; padding: 30px; box-sizing: border-box; }
    .header-table { width: 100%; margin-bottom: 20px; }
    .logo-text { color: #1e1b4b; font-size: 20px; font-weight: bold; text-align: right; text-transform: uppercase; }
    .logo-subtext { color: #6366f1; font-size: 10px; text-align: right; font-weight: bold; }
    .page-title { font-size: 16px; font-weight: bold; margin: 0; }
    .ride-id-text { font-size: 10px; color: #666666; margin-top: 5px; }
    .summary-section { text-align: center; margin: 20px 0; }
    .total-title { font-size: 12px; color: #666666; margin-bottom: 5px; }
    .total-amount { font-size: 26px; font-weight: bold; color: #000000; }
    .map-mock { border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 10px; background-color: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
    .map-placeholder { width: 65%; height: 120px; background: linear-gradient(45deg, #e2e8f0 25%, #cbd5e1 25%, #cbd5e1 50%, #e2e8f0 50%, #e2e8f0 75%, #cbd5e1 75%, #cbd5e1 100%); background-size: 40px 40px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #475569; font-weight: bold; border: 1px solid #cbd5e1; }
    .metrics-col { width: 30%; text-align: center; }
    .metric-value { font-size: 18px; font-weight: bold; color: #1e1b4b; margin-bottom: 2px; }
    .metric-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .address-list { margin: 20px 0; padding-left: 15px; border-left: 2px solid #cbd5e1; }
    .address-item { position: relative; margin-bottom: 15px; padding-left: 10px; }
    .address-item:last-child { margin-bottom: 0; }
    .address-item::before { content: ''; position: absolute; left: -15px; top: 3px; width: 8px; height: 8px; border-radius: 50%; }
    .address-item.pickup::before { background-color: #6366f1; }
    .address-item.drop::before { background-color: #ef4444; }
    .section-title { font-size: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 25px 0 10px 0; }
    .bill-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 11px; }
    .bill-row.total { font-weight: bold; border-top: 1px solid #e2e8f0; margin-top: 5px; padding-top: 8px; font-size: 12px; }
    .table-details { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .table-details td { padding: 6px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .table-details td.label-col { color: #666666; width: 40%; }
    .table-details td.val-col { font-weight: bold; text-align: right; }
    .legal-footer { font-size: 9px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
    .provider-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .provider-info { width: 60%; line-height: 1.4; }
    .qr-container { width: 80px; height: 80px; background-color: #eeeeee; border: 1px solid #cccccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #666666; text-align: center; }
  </style>
</head>
<body>

  <!-- PAGE 1: Payment Summary -->
  <div class="page-container">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 class="page-title">Payment Summary</h1>
          <div class="ride-id-text">Task ID: ${orderId}</div>
          <div style="font-size: 9px; color: #666666; margin-top: 2px;">Date: ${dateTime}</div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div class="logo-text">FLAVOUR</div>
          <div class="logo-subtext">TASKS</div>
        </td>
      </tr>
    </table>

    <div class="summary-section">
      <div class="total-title">Total Paid</div>
      <div class="total-amount">₹ ${Number(totalPrice).toFixed(2)}</div>
    </div>

    <!-- Map & Metrics -->
    <div class="map-mock">
      <div class="map-placeholder" style="background-image: url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=500&q=80'); background-size: cover; background-position: center; padding: 0; position: relative;">
        <img src="${staticMapUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; position: absolute; top: 0; left: 0;" alt="" />
      </div>
      <div class="metrics-col">
        <div class="metric-value">${Number(hours).toFixed(1)} hrs</div>
        <div class="metric-label">Total Hours Taken</div>
        
        <div class="metric-value">${Number(distance).toFixed(2)} km</div>
        <div class="metric-label">Distance</div>
      </div>
    </div>

    <div class="section-title">Timeline & Addresses</div>
    <div class="address-list">
      <div class="address-item pickup">
        <strong>Task Location / Start:</strong> ${pickupAddress}
      </div>
      <div class="address-item drop">
        <strong>Task Completion / End:</strong> ${dropAddress}
      </div>
    </div>

    <div class="section-title">Fare Breakdown</div>
    <div class="bill-row">
      <span>Task Charge</span>
      <span>₹ ${Number(taskCharge).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>Platform Convenience Fee</span>
      <span>₹ ${Number(platformFee).toFixed(2)}</span>
    </div>
    <div class="bill-row total">
      <span>Total Paid</span>
      <span>₹ ${Number(totalPrice).toFixed(2)}</span>
    </div>

    <div class="legal-footer">
      This is a summary. Page 2 and Page 3 contain the formal tax invoices for this service.
    </div>
  </div>

  <!-- PAGE 2: Agent Tax Invoice (Task Charge) -->
  <div class="page-container" style="page-break-before: always;">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 class="page-title">Tax Invoice</h1>
          <div class="ride-id-text">Task ID: ${orderId}</div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div class="logo-text">FLAVOUR</div>
          <div class="logo-subtext">TASKS</div>
        </td>
      </tr>
    </table>

    <table class="table-details">
      <tr>
        <td class="label-col">Invoice No.</td>
        <td class="val-col">${invoiceNo}</td>
      </tr>
      <tr>
        <td class="label-col">Invoice Date</td>
        <td class="val-col">${dateTime}</td>
      </tr>
      <tr>
        <td class="label-col">State</td>
        <td class="val-col">Telangana</td>
      </tr>
      <tr>
        <td class="label-col">Tax Category</td>
        <td class="val-col" style="font-size: 10px;">Domestic convenience helper and cleaning services (99979)</td>
      </tr>
      <tr>
        <td class="label-col">Place of Supply</td>
        <td class="val-col">Telangana</td>
      </tr>
      <tr>
        <td class="label-col">Agent Name</td>
        <td class="val-col">${driverName}</td>
      </tr>
      <tr>
        <td class="label-col">Customer Name</td>
        <td class="val-col">${userName}</td>
      </tr>
      <tr>
        <td class="label-col">Hours Billed</td>
        <td class="val-col">${Number(hours).toFixed(1)} hrs</td>
      </tr>
      <tr>
        <td class="label-col">Distance Traveled</td>
        <td class="val-col">${Number(distance).toFixed(2)} kms</td>
      </tr>
    </table>

    <div class="section-title">Bill Details</div>
    <div class="bill-row">
      <span>Agent Base Service Fee</span>
      <span>₹ ${Number(netFare).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>CGST (9%)</span>
      <span>₹ ${Number(taskCgstSgst).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>SGST (9%)</span>
      <span>₹ ${Number(taskCgstSgst).toFixed(2)}</span>
    </div>
    <div class="bill-row total">
      <span>Task Charge</span>
      <span>₹ ${Number(taskCharge).toFixed(2)}</span>
    </div>
    <div style="font-size: 9px; color: #94a3b8; text-align: right; margin-top: 2px;">(Inclusive of Taxes)</div>

    <div class="legal-footer">
      This document is issued by the Helper Service Provider and not by Flavour Private Limited. Flavour acts only as an Electronic Commerce Operator.
    </div>
  </div>

  <!-- PAGE 3: Platform Tax Invoice (Booking & Convenience Fee) -->
  <div class="page-container" style="page-break-before: always;">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 class="page-title">Tax Invoice</h1>
          <div class="ride-id-text">Task ID: ${orderId}</div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div class="logo-text">FLAVOUR</div>
          <div class="logo-subtext">TASKS</div>
        </td>
      </tr>
    </table>

    <div class="provider-section">
      <div class="provider-info">
        <strong>Flavour Private Limited</strong><br/>
        Ground Floor, Embassy Tech Village, Outer Ring Rd,<br/>
        Devarabisanahalli, Varthur, Bengaluru, Karnataka - 560103
      </div>
      <div class="qr-container" style="display: flex; align-items: center; justify-content: center; background-color: #ffffff; border: 1px solid #cbd5e1; width: 80px; height: 80px; box-sizing: border-box;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(orderId)}" style="width: 70px; height: 70px; display: block;" alt="QR Code" />
      </div>
    </div>

    <table class="table-details">
      <tr>
        <td class="label-col">Invoice No.</td>
        <td class="val-col">${platformInvoiceNo}</td>
      </tr>
      <tr>
        <td class="label-col">Invoice Date</td>
        <td class="val-col">${dateTime}</td>
      </tr>
      <tr>
        <td class="label-col">ECO Name</td>
        <td class="val-col">Flavour Private Limited</td>
      </tr>
      <tr>
        <td class="label-col">ECO GSTIN</td>
        <td class="val-col">36AAWCA9693G1ZS</td>
      </tr>
      <tr>
        <td class="label-col">ECO Address</td>
        <td class="val-col" style="font-size: 10px;">Ground Floor, Embassy Tech Village, Outer Ring Rd, Bengaluru, KA</td>
      </tr>
      <tr>
        <td class="label-col">Tax Category</td>
        <td class="val-col" style="font-size: 10px;">Electronic Commerce Platform Booking Services (998313)</td>
      </tr>
      <tr>
        <td class="label-col">Hours Billed</td>
        <td class="val-col">${Number(hours).toFixed(1)} hrs</td>
      </tr>
      <tr>
        <td class="label-col">Distance Traveled</td>
        <td class="val-col">${Number(distance).toFixed(2)} kms</td>
      </tr>
    </table>

    <div class="section-title">Bill Details</div>
    <div class="bill-row">
      <span>Convenience Charge</span>
      <span>₹ ${Number(convenienceCharges).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>Booking Fee</span>
      <span>₹ ${Number(bookingFee).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>CGST (9%)</span>
      <span>₹ ${Number(convenienceCgstSgst).toFixed(2)}</span>
    </div>
    <div class="bill-row">
      <span>SGST (9%)</span>
      <span>₹ ${Number(convenienceCgstSgst).toFixed(2)}</span>
    </div>
    <div class="bill-row total">
      <span>Platform Fee</span>
      <span>₹ ${Number(platformFee).toFixed(2)}</span>
    </div>
    <div style="font-size: 9px; color: #94a3b8; text-align: right; margin-top: 2px;">(Inclusive of Taxes)</div>

    <div style="margin-top: 20px; font-size: 10px; color: #666666;">
      <strong>Total Invoice Amount in Words (Pages 2 + 3):</strong> ${this.numberToWords(Math.round(totalPrice))} Rupees Only
    </div>

    <div class="legal-footer">
      This invoice is issued by Flavour Private Limited for Electronic Commerce platform convenience services. Settlement is completed via ${paymentMethod}.
    </div>
  </div>

</body>
</html>`;
  }

  /**
   * Generates email body HTML matching the Task trip confirmation layout (Indigo accents)
   */
  public generateTaskEmailHtml(order: any): string {
    const orderId = order._id || "";
    const staticMapUrl = this.getStaticMapUrl(order);
    const dateTime = this.formatDate(order.createdAt || new Date());
    const paymentMethod = order.paymentMethod || "Cash";
    const totalPrice = order.totalPrice || 0;
    
    const userName = order.user?.name || "Customer";
    const pickupAddress = order.stops[0]?.address || "";
    const dropAddress = order.stops[1]?.address || "";
    
    const distance = order.totalDistance || 0;
    const hours = order.duration || 2.5; // represented as hours

    const platformFee = totalPrice > 15 ? 7.00 : 3.00;
    const taskCharge = totalPrice - platformFee;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #ffffff; padding: 0; color: #000000; margin: 0; }
    .email-container { width: 100%; max-width: 500px; padding: 15px; box-sizing: border-box; background-color: #ffffff; }
    .summary-title { font-size: 11px; color: #888888; margin-bottom: 6px; }
    .brand-header { font-size: 20px; font-weight: bold; margin-bottom: 20px; font-family: Arial, sans-serif; color: #1e1b4b; }
    .brand-indigo { color: #6366f1; }
    .label-gray { font-size: 11px; color: #888888; margin-top: 12px; margin-bottom: 2px; }
    .value-bold { font-size: 13px; font-weight: bold; color: #000000; margin-bottom: 12px; }
    .total-bold { font-size: 16px; font-weight: bold; color: #000000; }
    
    .map-container { width: 280px; height: 120px; border: 1px solid #e2e8f0; border-radius: 4px; margin: 15px 0; overflow: hidden; position: relative; }
    .map-bg { width: 100%; height: 100%; background: radial-gradient(circle at 30% 20%, #e2e8f0 10%, transparent 11%), radial-gradient(circle at 80% 70%, #cbd5e1 8%, transparent 9%), #f1f5f9; position: relative; }
    .road-1 { position: absolute; top: 40px; left: 0; width: 100%; height: 12px; background-color: #ffffff; transform: rotate(-5deg); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
    .road-2 { position: absolute; top: 0; left: 180px; width: 12px; height: 100%; background-color: #ffffff; transform: rotate(15deg); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
    
    .pin-pickup { position: absolute; left: 50px; top: 75px; width: 20px; height: 20px; background-color: #6366f1; border: 2px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .pin-pickup-inner { width: 6px; height: 6px; background-color: white; border-radius: 50%; }
    .pin-pickup-label { position: absolute; left: 75px; top: 82px; background-color: #1e293b; color: white; padding: 2px 6px; font-size: 8px; border-radius: 4px; font-weight: bold; }
    
    .pin-drop { position: absolute; left: 200px; top: 30px; width: 20px; height: 20px; background-color: #ef4444; border: 2px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .pin-drop-inner { width: 6px; height: 6px; background-color: white; border-radius: 50%; }
    .pin-drop-label { position: absolute; left: 225px; top: 37px; background-color: #1e293b; color: white; padding: 2px 6px; font-size: 8px; border-radius: 4px; font-weight: bold; }
    
    .metric-title { font-size: 13px; font-weight: bold; color: #000000; margin-bottom: 2px; }
    .metric-sub { font-size: 9px; color: #888888; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px; }
    
    .location-timeline { margin: 15px 0; font-size: 12px; line-height: 1.5; max-width: 400px; }
    .location-row { display: flex; align-items: flex-start; margin-bottom: 12px; }
    .dot-pickup { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #6366f1; margin-right: 8px; margin-top: 5px; flex-shrink: 0; }
    .dot-drop { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #ef4444; margin-right: 8px; margin-top: 5px; flex-shrink: 0; }
    
    .bill-section-title { font-size: 14px; font-weight: bold; margin-top: 25px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; max-width: 400px; }
    .bill-table { width: 100%; max-width: 400px; border-collapse: collapse; margin-bottom: 15px; }
    .bill-table td { padding: 6px 0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="summary-title">Task Payment Summary</div>
    <div class="brand-header">
      flavour<span class="brand-indigo">tasks</span>
    </div>
    
    <div>
      <div class="label-gray">Task ID</div>
      <div class="value-bold">${orderId}</div>
      
      <div class="label-gray">Time of Task</div>
      <div class="value-bold">${dateTime}</div>
      
      <div class="label-gray">Total Paid</div>
      <div class="total-bold">₹ ${Number(totalPrice).toFixed(2)}</div>
    </div>

    <!-- Map Container -->
    ${staticMapUrl ? `
    <div style="margin: 15px 0; max-width: 280px; height: 120px; background-image: url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=500&q=80'); background-size: cover; background-position: center; border-radius: 4px; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
      <img src="${staticMapUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; position: absolute; top: 0; left: 0; display: block;" alt="" />
    </div>
    ` : ''}

    <div>
      <div class="metric-title">${Number(hours).toFixed(1)} hrs</div>
      <div class="metric-sub">TOTAL HOURS TAKEN</div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0; width: 280px;" />
      
      <div class="metric-title">${Number(distance).toFixed(2)} kms</div>
      <div class="metric-sub">DISTANCE</div>
    </div>

    <!-- Route Timeline -->
    <div class="location-timeline">
      <div class="location-row">
        <span class="dot-pickup"></span>
        <span>${pickupAddress}</span>
      </div>
      <div class="location-row">
        <span class="dot-drop"></span>
        <span>${dropAddress}</span>
      </div>
    </div>

    <!-- Bill Details -->
    <div>
      <div class="bill-section-title">Bill Details</div>
      
      <table class="bill-table">
        <tr>
          <td style="padding: 6px 0; color: #555555;">Task Booking Charge</td>
          <td style="padding: 6px 0; text-align: right; font-weight: bold;">₹ ${Number(taskCharge).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #555555;">Convenience & Booking Fee</td>
          <td style="padding: 6px 0; text-align: right; font-weight: bold;">₹ ${Number(platformFee).toFixed(2)}</td>
        </tr>
        <tr style="border-top: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; font-weight: bold;">Total Amount</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px;">₹ ${Number(totalPrice).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="2" style="font-size: 10px; color: #888888; padding-bottom: 12px;">(Inclusive of Taxes)</td>
        </tr>
        <tr style="border-top: 1px dashed #cbd5e1;">
          <td style="padding: 8px 0; font-weight: bold;">You Paid Using</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #555555; font-size: 12px;">${paymentMethod}</td>
          <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #16a34a; font-size: 13px;">₹ ${Number(totalPrice).toFixed(2)}</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
    `;
  }
}

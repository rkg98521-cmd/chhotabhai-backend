/**
 * Courier Tracking URL Resolution Engine
 * White-labeled fulfillment helper for dropshipping / Meesho parcel tracking.
 */

export const generateTrackingUrl = (courier, awb) => {
  if (!awb) return '';
  const cleanAwb = String(awb).trim();
  const cleanCourier = String(courier || '').trim().toLowerCase().replace(/[\s\-_]/g, '');

  switch (cleanCourier) {
    case 'delhivery':
      return `https://www.delhivery.com/track/package/${cleanAwb}`;

    case 'shadowfax':
      return `https://tracker.shadowfax.in/#/track/${cleanAwb}`;

    case 'xpressbees':
      return `https://www.xpressbees.com/shipment/tracking?awb=${cleanAwb}`;

    case 'ekart':
    case 'ekartlogistics':
      return `https://ekartlogistics.com/shipmenttrack/${cleanAwb}`;

    case 'bluedart':
    case 'bluedartexpress':
      return `https://www.bluedart.com/tracking?trackNumber=${cleanAwb}`;

    case 'dtdc':
    case 'dtdcexpress':
      return `https://www.dtdc.in/tracking/tracking_results.asp?Ttype=awb&strAwbNo=${cleanAwb}`;

    default:
      return `https://www.shipway.com/track/${cleanAwb}`;
  }
};

export default {
  generateTrackingUrl,
};

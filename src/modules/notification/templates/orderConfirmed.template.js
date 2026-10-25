/**
 * @file orderConfirmed.template.js
 * @description Responsive, production-ready HTML email template for ORDER_CONFIRMED.
 * Uses inline CSS for universal client compatibility (Gmail, Outlook, Apple Mail).
 */

export const renderOrderConfirmedEmail = ({
  customerName = 'Valued Customer',
  orderNumber = '',
  items = [],
  grandTotal = 0,
  orderDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  shippingAddress = {},
}) => {
  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
          <strong style="color: #0f172a; font-size: 13px; display: block;">${item.title || 'Mobile Accessory'}</strong>
          <span style="color: #64748b; font-size: 11px;">SKU: ${item.variantSku || 'GENERIC'} ${item.colorName ? `&bull; Color: ${item.colorName}` : ''}</span>
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #475569; font-size: 13px; font-weight: 600;">
          &times; ${item.quantity || 1}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a; font-size: 13px; font-weight: 700;">
          ₹${item.totalPrice || item.unitPrice * item.quantity || 0}
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed - #${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 28px 32px; background-color: #0f172a; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
                Chhota<span style="color: #e11938;">Bhai</span>
              </h1>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">
                Mobile Accessories &bull; 100% Authentic Store
              </p>
            </td>
          </tr>

          <!-- Confirmation Hero -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #ecfdf5; border: 1px solid #a7f3d0; margin-bottom: 16px; font-size: 26px;">
                &#10003;
              </div>
              <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 20px; font-weight: 800;">
                Thank You, ${customerName}!
              </h2>
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                Your prepaid order <strong style="color: #0f172a; font-family: monospace;">#${orderNumber}</strong> has been confirmed and paid. Our fulfillment center is currently preparing your package.
              </p>
            </td>
          </tr>

          <!-- Order Summary Meta Card -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 14px 18px;">
                <tr>
                  <td style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Order Date</td>
                  <td style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; text-align: right;">Payment Status</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #0f172a; font-weight: 700; padding-top: 4px;">${orderDate}</td>
                  <td style="font-size: 13px; color: #059669; font-weight: 800; text-align: right; padding-top: 4px;">PAID (Prepaid Online)</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Ordered Table -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                Order Summary
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 8px 0; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Item</th>
                    <th style="padding: 8px 10px; text-align: center; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Qty</th>
                    <th style="padding: 8px 0; text-align: right; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Total Breakdown -->
              <table role="presentation" width="100%" style="margin-top: 16px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Delivery Charges:</td>
                  <td style="padding: 6px 0; color: #059669; font-size: 13px; font-weight: 700; text-align: right;">FREE</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #0f172a; font-size: 16px; font-weight: 800; border-top: 2px solid #e2e8f0;">Grand Total Paid:</td>
                  <td style="padding: 10px 0; color: #e11938; font-size: 18px; font-weight: 900; text-align: right; border-top: 2px solid #e2e8f0;">₹${grandTotal}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Destination Card -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px;">
                <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 12px; font-weight: 800; text-transform: uppercase;">
                  Shipping Address
                </h4>
                <p style="margin: 0; color: #334155; font-size: 12px; line-height: 1.6;">
                  <strong>${shippingAddress.fullName || customerName}</strong><br>
                  ${shippingAddress.street || ''}${shippingAddress.landmark ? `, ${shippingAddress.landmark}` : ''}<br>
                  ${shippingAddress.city || ''}, ${shippingAddress.state || ''} - <strong>${shippingAddress.pincode || ''}</strong><br>
                  Contact: ${shippingAddress.phone || 'N/A'}
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="http://localhost:5173/track" style="display: inline-block; background-color: #e11938; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; padding: 14px 28px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(225, 25, 56, 0.25);">
                Track Your Order Live &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0;">Need help with your order? Reply directly to this email or contact support at <a href="mailto:support@chhotabhai.com" style="color: #e11938; text-decoration: none; font-weight: 600;">support@chhotabhai.com</a>.</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} ChhotaBhai Accessories. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

export default renderOrderConfirmedEmail;

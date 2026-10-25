/**
 * @file orderShipped.template.js
 * @description Responsive HTML email template for ORDER_SHIPPED.
 * Highlights Courier partner, AWB Tracking number, and live tracking action link.
 */

export const renderOrderShippedEmail = ({
  customerName = 'Valued Customer',
  orderNumber = '',
  courierCompany = 'Express Logistics',
  trackingNumber = '',
  trackingUrl = '',
  items = [],
  grandTotal = 0,
}) => {
  const finalTrackingUrl = trackingUrl || `http://localhost:5173/track?orderNumber=${encodeURIComponent(orderNumber)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your order #${orderNumber} is on the way!</title>
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
                Fulfillment & Logistics Network
              </p>
            </td>
          </tr>

          <!-- Shipped Hero Badge -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #eff6ff; border: 1px solid #bfdbfe; margin-bottom: 16px; font-size: 26px;">
                &#128666;
              </div>
              <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 20px; font-weight: 800;">
                Your Order is on the Way!
              </h2>
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                Great news, ${customerName}! Your order <strong style="color: #0f172a; font-family: monospace;">#${orderNumber}</strong> has been handed over to our shipping partner and is speeding towards your doorstep.
              </p>
            </td>
          </tr>

          <!-- Logistics & Tracking Card -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; padding: 20px; text-align: center;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="text-align: left; padding-bottom: 10px;">
                      <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block;">Courier Partner</span>
                      <strong style="font-size: 14px; color: #0f172a;">${courierCompany}</strong>
                    </td>
                    <td style="text-align: right; padding-bottom: 10px;">
                      <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block;">AWB / Tracking Number</span>
                      <strong style="font-size: 14px; color: #e11938; font-family: monospace;">${trackingNumber || 'Assigned in transit'}</strong>
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
                  <a href="${finalTrackingUrl}" style="display: inline-block; background-color: #e11938; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; padding: 12px 24px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Track Package Live &rarr;
                  </a>
                </div>
              </div>
            </td>
          </tr>

          <!-- Summary list -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 12px; font-weight: 800; text-transform: uppercase;">
                Package Contents (${items.length} items)
              </h3>
              <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 12px; line-height: 1.8;">
                ${items.map((i) => `<li><strong>${i.title}</strong> &times; ${i.quantity}</li>`).join('')}
              </ul>
            </td>
          </tr>

          <!-- Delivery Advisory note -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <div style="background-color: #f1f5f9; border-radius: 10px; padding: 12px 16px; font-size: 11px; color: #475569; line-height: 1.5;">
                <strong>&#9432; Delivery Advisory:</strong> Deliveries typically arrive within 2-4 business days. The delivery agent may request an OTP verification on your registered mobile number upon arrival.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0;">Questions about delivery? Email us at <a href="mailto:support@chhotabhai.com" style="color: #e11938; text-decoration: none; font-weight: 600;">support@chhotabhai.com</a>.</p>
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

export default renderOrderShippedEmail;

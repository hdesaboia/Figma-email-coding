class EmailTemplate {
  static generateNonIncentiveEmail() {
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Get expert care for your joint pain - Hinge Health</title>
    <style>
        /* Base styles */
        body { margin: 0; padding: 0; background-color: #ffffff; }
        table { border-spacing: 0; }
        td { padding: 0; }
        img { border: 0; display: block; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #ffffff; }
        .main { max-width: 600px; width: 100%; margin: 0 auto; }
        
        /* Typography */
        h1, h2, h3, h4, p { margin: 0; font-family: Arial, sans-serif; color: #1D1D1B; }
        h1 { font-size: 28px; line-height: 36px; margin-bottom: 20px; }
        h2 { font-size: 24px; line-height: 32px; margin-bottom: 16px; }
        p { font-size: 16px; line-height: 24px; margin-bottom: 16px; }
        
        /* Components */
        .step-number {
            background: #00B388;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 16px;
            text-align: center;
            line-height: 32px;
            display: inline-block;
        }
        
        .cta-button {
            background: #00B388;
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
        }
        
        /* Mobile styles */
        @media screen and (max-width: 600px) {
            .main { width: 100% !important; }
            .padding { padding: 0 20px !important; }
            h1 { font-size: 24px !important; line-height: 32px !important; }
            h2 { font-size: 20px !important; line-height: 28px !important; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <table role="presentation" class="main">
            <!-- Preheader -->
            <tr>
                <td>
                    <span style="display: none !important;">Get expert care for your joint pain - covered by your health plan</span>
                </td>
            </tr>

            <!-- Header/Logo -->
            <tr>
                <td class="padding" style="padding: 24px;">
                    <img src="https://hingehealth.com/logo.png" alt="Hinge Health" width="120" style="margin-bottom: 24px;">
                </td>
            </tr>

            <!-- Hero Section -->
            <tr>
                <td class="padding" style="padding: 0 24px;">
                    <h1>Hi {{firstName}},</h1>
                    <img src="{{heroImage}}" alt="Joint Pain Relief" width="100%" style="margin-bottom: 24px;">
                    <h2>Get the pain relief you deserve</h2>
                    <p>A lot of my patients come to me because they're tired of living with joint pain. As your dedicated physical therapist, I'm here to help you move better and feel better.</p>
                </td>
            </tr>

            <!-- Steps Section -->
            <tr>
                <td class="padding" style="padding: 24px;">
                    <h3 style="margin-bottom: 24px;">Getting started is easy</h3>
                    
                    <!-- Step 1 -->
                    <table role="presentation" width="100%" style="margin-bottom: 16px;">
                        <tr>
                            <td width="40" valign="top">
                                <div class="step-number">1</div>
                            </td>
                            <td style="padding-left: 16px;">
                                <h4>Join here</h4>
                                <p>Takes 10 minutes or less</p>
                            </td>
                        </tr>
                    </table>

                    <!-- Step 2 -->
                    <table role="presentation" width="100%" style="margin-bottom: 16px;">
                        <tr>
                            <td width="40" valign="top">
                                <div class="step-number">2</div>
                            </td>
                            <td style="padding-left: 16px;">
                                <h4>Start your program</h4>
                                <p>Virtual sessions with your care team</p>
                            </td>
                        </tr>
                    </table>

                    <!-- Step 3 -->
                    <table role="presentation" width="100%" style="margin-bottom: 32px;">
                        <tr>
                            <td width="40" valign="top">
                                <div class="step-number">3</div>
                            </td>
                            <td style="padding-left: 16px;">
                                <h4>Get support along the way</h4>
                                <p>From your PT and health coach</p>
                            </td>
                        </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" width="100%">
                        <tr>
                            <td align="center">
                                <a href="{{ctaLink}}" class="cta-button">GET EXPERT CARE</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Care Team Section -->
            <tr>
                <td class="padding" style="padding: 24px; text-align: center;">
                    <img src="{{ptImage}}" alt="Your Care Team" width="300" style="margin: 0 auto 16px;">
                    <p>Your dedicated care team is ready to help</p>
                </td>
            </tr>

            <!-- Support Section -->
            <tr>
                <td class="padding" style="padding: 24px;">
                    <h3>Questions?</h3>
                    <p>Our care team is here to help</p>
                    <p>{{supportEmail}}<br>{{supportPhone}}</p>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td style="background: #F7F7F7; padding: 24px; text-align: center;">
                    <p style="font-size: 12px; color: #666666;">
                        © 2024 Hinge Health, Inc. All rights reserved.<br>
                        <a href="{{unsubscribeUrl}}" style="color: #666666;">Unsubscribe</a>
                    </p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;
  }

  // This handles the API connection and authentication
  async exportImage(nodeId, settings) {
    try {
      // Get image export URL
      const response = await this.api.get(
        `/images/${nodeId}`,
        { params: settings }
      );
      
      // Download actual image data
      const imageData = await this.downloadImage(response.data.url);
      return imageData;
    } catch (error) {
      console.error('Export Error:', error);
      throw error;
    }
  }

  // This handles the actual screenshot capture
  async captureScreenshot(nodeId, variant) {
    const settings = {
      format: 'PNG',
      scale: 2,
      // Capture full frame
      include_bg: true,
      // Set viewport size
      viewport: {
        width: variant.includes('mobile') ? 320 : 600,
        height: 800
      }
    };
    
    const imageData = await this.figma.exportImage(nodeId, settings);
    return imageData;
  }
}

module.exports = EmailTemplate; 
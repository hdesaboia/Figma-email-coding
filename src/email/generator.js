class EmailGenerator {
  constructor(figmaData, masterTemplate) {
    this.figmaData = figmaData;
    this.masterTemplate = masterTemplate;
  }

  generateEmail() {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  {{snippets.CSS_Master_Template}}
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <!-- Preheader -->
  {{snippets.preheader_space_fix}}
  <span class="preheader" style="display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">
    Get expert care for your joint pain - covered by your health plan
  </span>

  <!-- Main Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 0;">
        
        <!-- Header Section -->
        {{snippets.2024_Universal_Logo_Dynamic_YM}}
        {{snippets.Padding_24px_Section}}
        
        <!-- Hero Section -->
        <table role="presentation" class="hero-section" style="width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 0 24px;">
              {% if useFirstNamePersonalization %}
                <h1>Hi {{firstName}},</h1>
              {% else %}
                <h1>Hi there,</h1>
              {% endif %}
              
              <img src="{{heroImage}}" alt="Joint Pain Relief" style="width: 100%; height: auto;" />
              
              <h2>Get the pain relief you deserve</h2>
              
              <p>A lot of my patients come to me because they're tired of living with joint pain.
              As your dedicated physical therapist, I'm here to help you move better and feel better.</p>
            </td>
          </tr>
        </table>
        
        <!-- Steps Section -->
        {{snippets.Padding_32px_Section}}
        <table role="presentation" class="steps-section" style="width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 0 24px;">
              <h3>Getting started is easy</h3>
              
              <div class="step">
                <span class="step-number">1</span>
                <h4>Join here</h4>
                <p>Takes 10 minutes or less</p>
              </div>
              
              <div class="step">
                <span class="step-number">2</span>
                <h4>Start your program</h4>
                <p>Virtual sessions with your care team</p>
              </div>
              
              <div class="step">
                <span class="step-number">3</span>
                <h4>Get support along the way</h4>
                <p>From your PT and health coach</p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" class="cta-button">
                <tr>
                  <td>
                    <a href="{{ctaLink}}" style="background-color: #00B388; color: white; padding: 16px 32px; text-decoration: none; border-radius: 4px; display: inline-block;">
                      GET EXPERT CARE
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Care Team Section -->
        {{snippets.Padding_32px_Section}}
        <table role="presentation" class="care-team" style="width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 0 24px;">
              <img src="{{ptImage}}" alt="Claudia Canales, Physical Therapist" style="width: 100%; max-width: 300px; height: auto;" />
              <p>Your dedicated care team is ready to help</p>
            </td>
          </tr>
        </table>
        
        <!-- Support Section -->
        {{snippets.Padding_24px_Section}}
        <table role="presentation" class="support-section" style="width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 0 24px;">
              <h3>Questions?</h3>
              <p>Our care team is here to help</p>
              <p>{{supportEmail}}</p>
              <p>{{supportPhone}}</p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        {{snippets.2024_White_footer}}
        {% if global.language == 'es' %}
          {{snippets.2024_Spanish_Footer_Banner}}
        {% endif %}
        
        <!-- Disclaimers -->
        {{snippets.2024_Universal_Eligibility_Disclaimer}}
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}

module.exports = EmailGenerator; 
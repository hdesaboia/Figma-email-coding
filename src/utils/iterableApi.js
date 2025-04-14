/**
 * Iterable API Utility
 * 
 * This module provides functions to:
 * - Fetch HTML emails from Iterable
 * - Extract email content and metadata
 * - Handle API authentication and pagination
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// API configuration
const API_CONFIG = {
  baseUrl: 'https://api.iterable.com/api',
  version: '1.0',
  timeout: 30000
};

/**
 * Fetches HTML emails from Iterable
 * @param {number} limit - Maximum number of emails to fetch
 * @returns {Promise<Array>} Array of email objects with HTML and metadata
 */
async function fetchIterableEmails(limit = 100) {
  try {
    // Get API key from environment
    const apiKey = process.env.ITERABLE_API_KEY;
    if (!apiKey) {
      throw new Error('ITERABLE_API_KEY environment variable is required');
    }
    
    // Configure API client
    const client = axios.create({
      baseURL: API_CONFIG.baseUrl,
      timeout: API_CONFIG.timeout,
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    // Fetch campaigns
    console.log('Fetching email campaigns...');
    const campaigns = await fetchCampaigns(client, limit);
    
    // Fetch email content for each campaign
    console.log('Fetching email content...');
    const emails = await Promise.all(
      campaigns.map(campaign => fetchEmailContent(client, campaign))
    );
    
    // Filter out failed fetches
    return emails.filter(email => email !== null);
  } catch (error) {
    console.error('Error fetching Iterable emails:', error);
    throw error;
  }
}

/**
 * Fetches email campaigns from Iterable
 * @param {Object} client - Axios client instance
 * @param {number} limit - Maximum number of campaigns to fetch
 * @returns {Promise<Array>} Array of campaign objects
 */
async function fetchCampaigns(client, limit) {
  try {
    const response = await client.get('/campaigns', {
      params: {
        limit,
        type: 'email'
      }
    });
    
    return response.data.campaigns || [];
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
}

/**
 * Fetches email content for a campaign
 * @param {Object} client - Axios client instance
 * @param {Object} campaign - Campaign object
 * @returns {Promise<Object|null>} Email object with HTML and metadata
 */
async function fetchEmailContent(client, campaign) {
  try {
    // Fetch email template
    const response = await client.get(`/templates/${campaign.templateId}`);
    const template = response.data;
    
    // Extract HTML content
    const html = template.htmlContent || template.plainTextContent;
    if (!html) {
      console.warn(`No HTML content found for campaign ${campaign.id}`);
      return null;
    }
    
    // Create email object
    return {
      id: campaign.id,
      name: campaign.name,
      html,
      metadata: {
        campaignId: campaign.id,
        templateId: campaign.templateId,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        type: campaign.type
      }
    };
  } catch (error) {
    console.error(`Error fetching content for campaign ${campaign.id}:`, error);
    return null;
  }
}

/**
 * Saves email content to file
 * @param {Object} email - Email object
 * @param {string} outputDir - Output directory
 */
async function saveEmailToFile(email, outputDir) {
  try {
    const fileName = `email_${email.id}.html`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(filePath, email.html);
    
    return filePath;
  } catch (error) {
    console.error(`Error saving email ${email.id} to file:`, error);
    throw error;
  }
}

module.exports = {
  fetchIterableEmails,
  saveEmailToFile
}; 
/**
 * Example Usage of AI Sensy Service
 * 
 * This file demonstrates how to use the AI Sensy service to send WhatsApp messages
 */

import { AISensyService } from "../../services/aisensy.service.js";

// Example: Send a text message
async function exampleSendText() {
  const aisensyService = new AISensyService();
  
  const result = await aisensyService.sendTextMessage(
    "917089379345",
    "Hello! This is a test message from Sundus AI."
  );
  
  if (result.success) {
    console.log("Message sent successfully!", result.message_id);
  } else {
    console.error("Failed to send message:", result.error);
  }
}

// Example: Send message with feedback prompt
async function exampleSendWithFeedback() {
  const aisensyService = new AISensyService();
  
  const result = await aisensyService.sendMessageWithFeedback(
    "917089379345",
    "I found 5 Nike watches for you. Here are the top results..."
  );
  
  console.log("Message with feedback sent:", result);
}

// Example: Send image
async function exampleSendImage() {
  const aisensyService = new AISensyService();
  
  const result = await aisensyService.sendImageMessage(
    "917089379345",
    "https://example.com/product-image.jpg",
    "Nike Watch Model X"
  );
  
  console.log("Image sent:", result);
}

// Example: Send OTP
async function exampleSendOTP() {
  const aisensyService = new AISensyService();
  
  const result = await aisensyService.sendOTPMessage(
    "917089379345",
    "123456"
  );
  
  console.log("OTP sent:", result);
}

// Example: Get message details
async function exampleGetMessageDetails() {
  const aisensyService = new AISensyService();
  
  // First send a message
  const sendResult = await aisensyService.sendTextMessage(
    "917089379345",
    "Test message"
  );
  
  if (sendResult.success && sendResult.message_id) {
    // Get message details
    const details = await aisensyService.getMessageDetails(sendResult.message_id);
    console.log("Message details:", details);
    
    // Check if message was read
    const isRead = await aisensyService.isMessageRead(sendResult.message_id);
    console.log("Message read:", isRead);
    
    // Get message status
    const status = await aisensyService.getMessageStatus(sendResult.message_id);
    console.log("Message status:", status);
  }
}

export {
  exampleSendText,
  exampleSendWithFeedback,
  exampleSendImage,
  exampleSendOTP,
  exampleGetMessageDetails,
};


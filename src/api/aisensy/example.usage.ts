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
    "917676079163",
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
    "917676079163",
    "I found 5 Nike watches for you. Here are the top results..."
  );
  
  console.log("Message with feedback sent:", result);
}

// Example: Send image
async function exampleSendImage() {
  const aisensyService = new AISensyService();
  
  const result = await aisensyService.sendImageMessage(
    "917676079163",
    "https://example.com/product-image.jpg",
    "Nike Watch Model X"
  );
  
  console.log("Image sent:", result);
}

// Example: Send image gallery (multiple images)
async function exampleSendImageGallery() {
  const aisensyService = new AISensyService();
  
  const images = [
    { url: "https://example.com/product-1.jpg", caption: "Product 1" },
    { url: "https://example.com/product-2.jpg", caption: "Product 2" },
    { url: "https://example.com/product-3.jpg" },
  ];
  
  const results = await aisensyService.sendImageGallery(
    "917676079163",
    images
  );
  
  console.log("Image gallery sent:", results);
}

// Example: Send audio message
async function exampleSendAudio() {
  const aisensyService = new AISensyService();
  
  const result = await aisensyService.sendAudioMessage(
    "917676079163",
    "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg"
  );
  
  console.log("Audio sent:", result);
}

// Example: Send document message
async function exampleSendDocument() {
  const aisensyService = new AISensyService();
  
  const result = await aisensyService.sendDocumentMessage(
    "917676079163",
    "https://www.clickdimensions.com/links/TestPDFfile.pdf",
    "product-catalog.pdf",
    "Your product catalog"
  );
  
  console.log("Document sent:", result);
}

// Example: Send quick reply message (interactive buttons)
async function exampleSendQuickReply() {
  const aisensyService = new AISensyService();
  
  const result = await aisensyService.sendQuickReplyMessage(
    "917676079163",
    "Would you like to track your order?",
    [
      { text: "Yes", payload: "track_order" },
      { text: "No", payload: "skip" },
    ]
  );
  
  console.log("Quick reply sent:", result);
}

// Example: Send template message (HSM)
async function exampleSendTemplate() {
  const aisensyService = new AISensyService();
  
  // Template with body parameters
  const result = await aisensyService.sendTemplateMessage(
    "917676079163",
    "sample_shipping_confirmation",
    "en_us",
    [
      {
        type: "body",
        parameters: [
          { type: "text", text: "6-7" }
        ]
      }
    ]
  );
  
  console.log("Template sent:", result);
}

// Example: Send template with quick reply (empty components)
async function exampleSendTemplateQuickReply() {
  const aisensyService = new AISensyService();
  
  const result = await aisensyService.sendTemplateMessage(
    "917676079163",
    "quicky_reply_type_template",
    "en"
    // Empty components array for quick reply templates
  );
  
  console.log("Template quick reply sent:", result);
}

// Example: Get message details
async function exampleGetMessageDetails() {
  const aisensyService = new AISensyService();
  
  // First send a message
  const sendResult = await aisensyService.sendTextMessage(
    "917676079163",
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
  exampleSendImageGallery,
  exampleSendAudio,
  exampleSendDocument,
  exampleSendQuickReply,
  exampleSendTemplate,
  exampleSendTemplateQuickReply,
  exampleGetMessageDetails,
};


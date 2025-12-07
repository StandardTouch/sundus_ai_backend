# Sundus AI - Guardrails & Safety

## Overview

Guardrails are critical safety mechanisms that ensure the AI agent operates safely, securely, and within defined boundaries. This document outlines all guardrails implemented in Sundus AI.

---

## Guardrail Categories

### 1. Content Moderation & Safety

**Purpose:** Prevent harmful, inappropriate, or unsafe content

#### OpenAI Built-in Moderation
- **OpenAI Moderation API:** Check all user inputs before processing
- **Response Filtering:** Filter AI responses for harmful content
- **Content Categories:** Hate, harassment, self-harm, sexual, violence, etc.

**Implementation:**
```typescript
// Before processing user message
const moderation = await openai.moderations.create({
  input: userMessage
});

if (moderation.results[0].flagged) {
  // Block message, send generic response
  return "I can't process that request. How else can I help you?";
}
```

#### Response Content Validation
- Check AI responses for inappropriate content
- Filter out sensitive information
- Ensure responses are appropriate for business context

---

### 2. Prompt Injection Prevention

**Purpose:** Prevent users from manipulating the AI's behavior or accessing system prompts

#### Input Sanitization
- Remove or escape special characters that could be used for injection
- Validate input format
- Limit input length

**Implementation:**
```typescript
function sanitizeInput(input: string): string {
  // Remove potential injection patterns
  return input
    .replace(/system:|user:|assistant:/gi, '')
    .replace(/<\|.*?\|>/g, '')
    .trim()
    .slice(0, MAX_INPUT_LENGTH);
}
```

#### System Prompt Protection
- Never expose system prompts to users
- Use separate system/user/assistant message roles correctly
- Validate message structure before sending to OpenAI

#### Conversation Boundary Enforcement
- Prevent users from accessing conversation history manipulation
- Limit context window to prevent prompt injection via history
- Validate conversation state integrity

---

### 3. Tool Call Validation

**Purpose:** Ensure AI only calls tools with valid, authorized parameters

#### Parameter Validation
- Validate all tool call parameters before execution
- Type checking (string, number, etc.)
- Range validation (e.g., order_id format)
- Required field validation

**Implementation:**
```typescript
// Before executing tool
function validateToolCall(toolName: string, args: any): ValidationResult {
  switch (toolName) {
    case "track_order":
      if (!args.order_id || typeof args.order_id !== 'string') {
        return { valid: false, error: "Invalid order_id" };
      }
      if (!args.phone_number || !isValidPhoneNumber(args.phone_number)) {
        return { valid: false, error: "Invalid phone_number" };
      }
      return { valid: true };
    // ... other tools
  }
}
```

#### Tool Authorization
- Verify user has permission to call specific tools
- Check authentication status for sensitive operations
- Prevent unauthorized tool calls

**Example:**
```typescript
// Order tracking requires authentication
if (toolName === "get_order_details" && !conversation.token) {
  return { error: "Authentication required" };
}
```

#### Rate Limiting on Tools
- Limit number of tool calls per conversation
- Prevent tool call loops
- Set maximum tool calls per message

---

### 4. Input Validation & Sanitization

**Purpose:** Ensure all inputs are safe and properly formatted

#### Phone Number Validation
- Validate phone number format
- Normalize phone numbers
- Prevent injection via phone number field

**Implementation:**
```typescript
function validatePhoneNumber(phone: string): boolean {
  // Remove non-digits
  const cleaned = phone.replace(/\D/g, '');
  // Validate length and format
  return /^[0-9]{9,15}$/.test(cleaned);
}
```

#### Order ID Validation
- Validate order ID format
- Prevent SQL injection or command injection
- Sanitize order IDs before API calls

#### Search Query Validation
- Limit search query length
- Sanitize special characters
- Prevent injection attacks

#### OTP Validation
- Validate OTP format (numeric, 4-6 digits)
- Prevent injection via OTP field
- Rate limit OTP attempts

---

### 5. Output Filtering & Sanitization

**Purpose:** Ensure AI responses are safe and appropriate

#### Response Content Filtering
- Filter sensitive information (tokens, API keys, etc.)
- Remove potentially harmful content
- Ensure responses match expected format

#### PII (Personally Identifiable Information) Protection
- Never expose user tokens in responses
- Mask sensitive order information if needed
- Protect customer data

#### Response Length Limits
- Limit response length to prevent abuse
- Truncate overly long responses
- Ensure responses fit WhatsApp message limits

---

### 6. Rate Limiting

**Purpose:** Prevent abuse and ensure fair usage

#### Per-User Rate Limits
- Maximum messages per minute/hour
- Maximum tool calls per conversation
- Maximum API calls per user

**Implementation:**
```typescript
// Rate limiting middleware
const rateLimiter = {
  messages: new Map<string, number[]>(), // phone -> timestamps
  
  checkLimit(phone: string, limit: number, window: number): boolean {
    const now = Date.now();
    const timestamps = this.messages.get(phone) || [];
    const recent = timestamps.filter(ts => now - ts < window);
    
    if (recent.length >= limit) {
      return false; // Rate limit exceeded
    }
    
    recent.push(now);
    this.messages.set(phone, recent);
    return true;
  }
};
```

#### OTP Rate Limiting
- Maximum 3 OTP requests per hour per phone number
- Maximum 5 OTP verification attempts per OTP
- Cooldown period after failed attempts

#### API Rate Limiting
- Limit calls to external APIs
- Implement exponential backoff
- Cache responses where appropriate

---

### 7. Token & Context Management

**Purpose:** Prevent token limit abuse and manage costs

#### Token Limits
- Maximum tokens per conversation
- Maximum tokens per message
- Automatic context truncation when limit approached

**Implementation:**
```typescript
function manageContext(history: Message[], maxTokens: number): Message[] {
  let totalTokens = 0;
  const trimmed: Message[] = [];
  
  // Keep most recent messages first
  for (let i = history.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(history[i]);
    if (totalTokens + msgTokens > maxTokens) break;
    trimmed.unshift(history[i]);
    totalTokens += msgTokens;
  }
  
  return trimmed;
}
```

#### Context Window Management
- Limit conversation history length
- Remove old messages when limit reached
- Keep important context (authentication, active flows)

#### Cost Controls
- Monitor token usage per conversation
- Set daily/monthly token limits
- Alert on excessive usage

---

### 8. Conversation Boundaries

**Purpose:** Maintain conversation integrity and prevent manipulation

#### Conversation State Validation
- Validate conversation state before processing
- Prevent state manipulation
- Ensure conversation continuity

#### Session Management
- Timeout inactive conversations
- Limit conversation duration
- Clean up expired sessions

#### Context Isolation
- Ensure conversations don't leak data between users
- Validate user ownership of conversations
- Prevent cross-conversation data access

---

### 9. Error Handling & Fallbacks

**Purpose:** Gracefully handle errors and prevent information leakage

#### Error Message Sanitization
- Never expose internal errors to users
- Generic error messages for users
- Detailed errors only in logs

**Implementation:**
```typescript
try {
  // Operation
} catch (error) {
  logger.error("Internal error", { error, context });
  // Generic user message
  return "I encountered an issue. Please try again or contact support.";
}
```

#### Tool Execution Failures
- Handle tool execution errors gracefully
- Retry with exponential backoff
- Fallback to alternative approaches

#### API Failure Handling
- Handle external API failures
- Implement circuit breakers
- Fallback responses when APIs unavailable

---

### 10. Authentication & Authorization

**Purpose:** Ensure only authorized users can access sensitive operations

#### OTP Authentication
- Secure OTP generation (cryptographically random)
- OTP expiration (5 minutes)
- One-time use only
- Rate limiting on OTP requests

#### Token Validation
- Validate tokens before sensitive operations
- Check token expiration
- Refresh tokens when needed

#### User Verification
- Verify phone number ownership
- Validate user identity for order tracking
- Prevent unauthorized order access

---

### 11. Data Privacy & Protection

**Purpose:** Protect user data and ensure privacy compliance

#### Data Encryption
- Encrypt sensitive data at rest
- Encrypt data in transit (HTTPS)
- Encrypt tokens and authentication data

#### Data Retention
- Implement data retention policies
- Delete expired OTPs
- Archive old conversations
- GDPR compliance

#### PII Handling
- Minimize PII collection
- Mask sensitive data in logs
- Secure data storage

---

### 12. Tool-Specific Guardrails

#### Product Search Guardrails
- Limit search results (max 10 products)
- Validate search query length
- Sanitize search parameters
- Prevent search injection

#### Order Tracking Guardrails
- Require authentication for order access
- Verify order ownership (phone number match)
- Limit order lookup rate
- Mask sensitive order information

#### FAQ Search Guardrails
- Limit FAQ results (top 3)
- Validate similarity threshold
- Prevent FAQ database manipulation
- Sanitize search queries

---

## Implementation Structure

### Guardrails Module Organization

```
src/
├── guardrails/
│   ├── index.ts                    # Main guardrails orchestrator
│   ├── content.moderation.ts       # Content moderation
│   ├── prompt.injection.ts         # Prompt injection prevention
│   ├── tool.validation.ts          # Tool call validation
│   ├── input.validation.ts         # Input validation
│   ├── output.filtering.ts         # Output filtering
│   ├── rate.limiting.ts            # Rate limiting
│   ├── token.management.ts         # Token/context management
│   ├── error.handling.ts           # Error handling
│   └── auth.guardrails.ts         # Authentication guardrails
```

### Guardrails Execution Flow

```
User Message
    ↓
1. Input Validation
   - Sanitize input
   - Validate format
   - Check length
    ↓
2. Content Moderation
   - Check for harmful content
   - Block if flagged
    ↓
3. Prompt Injection Check
   - Detect injection patterns
   - Sanitize if needed
    ↓
4. Rate Limiting
   - Check user rate limits
   - Block if exceeded
    ↓
5. Process with AI Agent
    ↓
6. Tool Call Validation (if tool called)
   - Validate parameters
   - Check authorization
   - Rate limit tool calls
    ↓
7. Output Filtering
   - Filter sensitive info
   - Validate response format
   - Check content safety
    ↓
8. Send Response
```

---

## Configuration

### Environment Variables

```env
# Guardrails Configuration
MAX_MESSAGE_LENGTH=2000
MAX_TOKENS_PER_CONVERSATION=4000
MAX_TOOL_CALLS_PER_MESSAGE=5
MAX_MESSAGES_PER_MINUTE=10
MAX_MESSAGES_PER_HOUR=100
OTP_RATE_LIMIT=3
OTP_EXPIRY_MINUTES=5
MAX_OTP_ATTEMPTS=5
CONTENT_MODERATION_ENABLED=true
PROMPT_INJECTION_DETECTION=true
```

---

## Monitoring & Alerts

### Metrics to Monitor

1. **Content Moderation**
   - Number of flagged messages
   - Content categories flagged
   - False positive rate

2. **Rate Limiting**
   - Rate limit violations
   - Per-user usage patterns
   - API call volumes

3. **Tool Calls**
   - Tool call frequency
   - Failed tool calls
   - Unauthorized tool attempts

4. **Errors**
   - Error rates
   - Error types
   - Recovery success rate

5. **Token Usage**
   - Token consumption per conversation
   - Cost per conversation
   - Token limit violations

### Alerts

- High rate of flagged content
- Unusual tool call patterns
- Rate limit abuse
- Token usage spikes
- Authentication failures
- Error rate spikes

---

## Testing Guardrails

### Unit Tests
- Test each guardrail function independently
- Test edge cases
- Test injection attempts

### Integration Tests
- Test guardrails in message flow
- Test tool call validation
- Test rate limiting

### Penetration Testing
- Attempt prompt injection
- Attempt tool call manipulation
- Attempt rate limit bypass
- Attempt unauthorized access

---

## Best Practices

1. **Defense in Depth**
   - Multiple layers of protection
   - Don't rely on single guardrail
   - Fail securely

2. **Fail Securely**
   - Default to blocking/denying
   - Log all security events
   - Alert on suspicious activity

3. **Regular Updates**
   - Update guardrails based on new threats
   - Monitor for bypass attempts
   - Improve detection patterns

4. **Transparency**
   - Log all guardrail actions
   - Monitor false positives
   - Adjust based on feedback

5. **Performance**
   - Guardrails should not significantly impact performance
   - Cache where appropriate
   - Optimize validation logic

---

## OpenAI-Specific Guardrails

### Using OpenAI Moderation API
```typescript
import { openai } from '../config/openai';

async function moderateContent(input: string): Promise<boolean> {
  const moderation = await openai.moderations.create({ input });
  return !moderation.results[0].flagged;
}
```

### System Prompt Safety
- Never include user-controlled content in system prompts
- Use separate system/user/assistant roles
- Validate message structure

### Function Calling Safety
- Validate all function parameters
- Check function authorization
- Limit function call depth
- Prevent recursive function calls

### Response Safety
- Use OpenAI's safety settings
- Filter responses for sensitive data
- Validate response format

---

## Compliance

### GDPR Compliance
- User data encryption
- Right to deletion
- Data retention policies
- Consent management

### Security Standards
- OWASP Top 10 compliance
- Secure coding practices
- Regular security audits
- Vulnerability management

---

_Last Updated: [Current Date]_
_Version: 1.0.0_


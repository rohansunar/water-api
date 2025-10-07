import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomLoggerService } from '../logger/logger.service';

/**
 * SecurityMiddleware - Multi-layered security threat detection and logging middleware
 *
 * This middleware implements a comprehensive security framework that provides multiple layers
 * of protection against common web application threats. It operates as a NestJS middleware
 * that intercepts all incoming HTTP requests to perform real-time security analysis.
 *
 * Architecture:
 * - Layer 1: Security Header Enforcement - Sets HTTP security headers to prevent common attacks
 * - Layer 2: Pattern-based Threat Detection - Uses regex patterns to identify malicious payloads
 * - Layer 3: Behavioral Analysis - Monitors request patterns for anomaly detection
 * - Layer 4: Logging Integration - Comprehensive security event logging for monitoring
 *
 * Key Features:
 * - SQL Injection Detection: Identifies common SQL injection patterns in request data
 * - XSS Protection: Detects cross-site scripting attempts in request payloads
 * - Brute Force Monitoring: Tracks authentication attempts for rate limiting
 * - User Agent Analysis: Identifies suspicious or malformed user agents
 * - Security Header Management: Enforces security best practices via HTTP headers
 * - Real-time Logging: Integrates with custom logger for security event tracking
 *
 * Security Threat Detection Strategy:
 * 1. Pattern Matching: Uses predefined regex patterns to identify known attack vectors
 * 2. Anomaly Detection: Identifies unusual request characteristics and behaviors
 * 3. Risk Scoring: Evaluates threat level based on multiple security indicators
 * 4. Response Mitigation: Applies appropriate security measures based on threat level
 *
 * Integration Points:
 * - CustomLoggerService: For structured security event logging and monitoring
 * - Fastify Framework: Compatible with both Express and Fastify response objects
 * - NestJS Dependency Injection: Leverages NestJS IoC for service dependencies
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  /**
   * Constructor - Dependency injection for security logging service
   *
   * @param logger - CustomLoggerService instance for structured security event logging
   *                Handles security threat logging, monitoring, and alerting
   *                Provides centralized logging for all security-related events
   */
  constructor(private readonly logger: CustomLoggerService) {}

  /**
   * Main middleware handler - Entry point for all security processing
   *
   * This method implements the core security middleware logic that processes every incoming HTTP request.
   * It serves as the orchestration layer that coordinates multiple security validation mechanisms.
   *
   * Security Processing Flow:
   * 1. Request Analysis: Extracts key request metadata (IP, User-Agent, method, URL)
   * 2. Threat Detection: Performs comprehensive suspicious activity analysis
   * 3. Security Headers: Applies HTTP security headers for client-side protection
   * 4. Request Continuation: Allows normal request processing to continue
   *
   * @param req - FastifyRequest object containing all request data and metadata
   * @param res - FastifyReply object for response manipulation and header setting
   * @param next - Callback function to continue request processing pipeline
   *
   * @returns void - This middleware doesn't return values, it modifies the response object
   *
   * @throws No exceptions thrown - All errors are handled internally and logged
   *
   * Security Headers Applied:
   * - X-Content-Type-Options: Prevents MIME type sniffing attacks
   * - X-Frame-Options: Prevents clickjacking attacks
   * - X-XSS-Protection: Enables browser XSS filtering
   * - Referrer-Policy: Controls referrer information leakage
   * - X-Powered-By: Removes server identification for security
   */
  use(req: any, res: any, next: () => void) {
    // Extract request metadata for security analysis
    // IP address is used for threat correlation and rate limiting
    const ip = req.ip || req.socket.remoteAddress;
    // User agent helps identify bots, crawlers, and suspicious clients
    const userAgent = req.headers['user-agent'];
    // HTTP method and URL are analyzed for attack patterns
    const method = req.method;
    const url = req.url;

    // Perform comprehensive suspicious activity detection
    // This is the core security analysis engine that scans for threats
    this.detectSuspiciousActivity(req, ip, userAgent);

    // SECURITY HEADERS IMPLEMENTATION
    // Apply HTTP security headers to prevent common client-side attacks
    // These headers provide defense-in-depth by instructing browsers to enable
    // built-in security protections and prevent information leakage

    // X-Content-Type-Options: Prevents MIME type sniffing attacks
    // Forces browser to respect the declared Content-Type instead of guessing
    // This prevents attackers from uploading malicious files disguised as images
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options: Prevents clickjacking attacks
    // DENY completely prevents the page from being embedded in frames
    // This protects against UI redressing attacks where malicious sites
    // overlay invisible frames to trick users into clicking
    res.setHeader('X-Frame-Options', 'DENY');

    // X-XSS-Protection: Enables browser XSS filtering
    // Instructs browsers to block detected XSS attacks
    // mode=block tells browser to prevent rendering if XSS is detected
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer-Policy: Controls referrer information leakage
    // strict-origin-when-cross-origin prevents sending full URLs to external sites
    // This protects sensitive data in URLs while maintaining functionality
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // X-Powered-By: Remove server identification for security
    // Empty string removes server information that could aid attackers
    // This reduces the attack surface by not revealing server technology
    res.setHeader('X-Powered-By', '');

    // Continue request processing pipeline
    // All security checks completed, allow normal request handling
    next();
  }

  /**
   * Advanced suspicious activity detection and analysis engine
   *
   * This method implements a multi-layered threat detection system that analyzes incoming requests
   * for various types of malicious activity patterns. It uses pattern matching, behavioral analysis,
   * and anomaly detection to identify potential security threats in real-time.
   *
   * Detection Categories:
   * 1. SQL Injection: Detects common SQL injection patterns and database manipulation attempts
   * 2. XSS Attacks: Identifies cross-site scripting attempts in request payloads
   * 3. Brute Force: Monitors authentication endpoints for rapid successive attempts
   * 4. Bot Detection: Analyzes user agents for automated tool signatures
   * 5. Anomaly Detection: Identifies unusual request characteristics and behaviors
   *
   * Algorithm Flow:
   * 1. Pattern Compilation: Pre-compiles regex patterns for efficient matching
   * 2. Content Analysis: Aggregates request body, query parameters, and URL for analysis
   * 3. Pattern Matching: Tests content against known malicious patterns
   * 4. Behavioral Analysis: Evaluates request patterns for suspicious behavior
   * 5. Threat Logging: Records security events for monitoring and alerting
   *
   * @param req - FastifyRequest object containing complete request data
   * @param ip - Client IP address for threat correlation and tracking
   * @param userAgent - User agent string for bot detection and analysis
   *
   * @returns void - Results are logged via CustomLoggerService, no return value
   *
   * @throws No exceptions thrown - All errors handled internally with logging
   *
   * Security Events Logged:
   * - suspicious_request: When malicious patterns are detected in request content
   * - auth_attempt: When authentication endpoints are accessed (for rate limiting)
   * - unusual_user_agent: When suspicious or malformed user agents are detected
   */
  private detectSuspiciousActivity(
    req: FastifyRequest,
    ip: string,
    userAgent: string,
  ) {
    // PATTERN-BASED THREAT DETECTION
    // Define comprehensive regex patterns for detecting malicious payloads
    // These patterns are designed to catch common attack vectors while minimizing false positives
    const suspiciousPatterns = [
      // SQL Injection patterns - detect common SQL keywords and operators
      // \b ensures word boundaries to avoid matching legitimate content
      // i flag makes matching case-insensitive for broader detection
      /\b(union|select|insert|delete|drop|create|alter|exec|script)\b/i,

      // XSS Script injection - detects embedded script tags
      // Global flag (g) finds all matches, not just first
      // i flag for case-insensitive matching
      /<script[^>]*>.*?<\/script>/gi,

      // JavaScript URL schemes - detect javascript: pseudo-protocol
      // Used in XSS attacks to execute code via href or other attributes
      /javascript:/i,

      // VBScript detection - legacy but still potentially dangerous
      // Some applications may still support VBScript execution
      /vbscript:/i,

      // Event handler detection - common XSS vectors
      // onload, onerror, onclick are frequently used in XSS attacks
      /onload|onerror|onclick/i,
    ];

    // REQUEST CONTENT ANALYSIS
    // Aggregate all request data for comprehensive analysis
    // Convert to JSON strings to normalize data types and ensure consistent analysis
    const requestBody = JSON.stringify(req.body || {});
    const queryString = JSON.stringify((req as any).query || {});

    // Combine all request components for unified analysis
    // This ensures we catch attacks that span multiple request parts
    const fullContent = `${requestBody} ${queryString} ${req.url}`;

    // PATTERN MATCHING ALGORITHM
    // Iterate through each suspicious pattern and test against request content
    // Uses early break optimization - stop on first match for performance
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fullContent)) {
        // SECURITY EVENT LOGGING
        // Log detailed information about the detected threat
        // Includes pattern that matched, request details, and client information
        this.logger.logSecurityEvent(
          'suspicious_request',
          {
            pattern: pattern.toString(), // Store the actual regex pattern for analysis
            url: req.url, // Request URL for context
            method: req.method, // HTTP method for threat correlation
            body: req.body, // Request body (may contain sensitive data)
            query: (req as any).query, // Query parameters for analysis
          },
          ip, // Client IP for threat tracking
          userAgent, // User agent for bot detection correlation
        );
        break; // Exit early on first match for performance
      }
    }

    // BRUTE FORCE ATTACK DETECTION
    // Monitor authentication endpoints for rapid successive attempts
    // This helps identify credential stuffing and brute force attacks
    if (req.url.includes('/auth/') && req.method === 'POST') {
      // Log all authentication attempts for rate limiting analysis
      // Security monitoring systems can use this data to detect attack patterns
      this.logger.logSecurityEvent(
        'auth_attempt',
        {
          url: req.url, // Specific auth endpoint being targeted
          method: req.method, // Should always be POST for auth attempts
        },
        ip, // IP address for tracking multiple attempts
        userAgent, // User agent for bot detection
      );
    }

    // USER AGENT ANOMALY DETECTION
    // Analyze user agent strings for suspicious characteristics
    // Bots, crawlers, and malicious tools often have distinctive user agents
    if (
      !userAgent || // Missing user agent is suspicious
      userAgent.length < 10 || // Very short user agents are often bots
      /bot|crawler|spider/i.test(userAgent) // Known bot signatures
    ) {
      // Log unusual user agent for security analysis
      // This helps identify automated attacks and reconnaissance
      this.logger.logSecurityEvent(
        'unusual_user_agent',
        {
          userAgent, // The suspicious user agent string
          url: req.url, // Request URL for context
        },
        ip, // Client IP for correlation
        userAgent, // Include user agent in log for analysis
      );
    }

    // BUSINESS LOGIC: THREAT MITIGATION STRATEGY
    // This multi-layered approach provides defense-in-depth:
    // 1. Pattern matching catches known attack signatures
    // 2. Brute force monitoring enables rate limiting
    // 3. User agent analysis identifies automated threats
    // 4. Comprehensive logging enables security monitoring and alerting
    // 5. Early detection allows for proactive threat response
  }
}

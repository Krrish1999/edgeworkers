import Alert from '../models/Alert.js';
import nodemailer from 'nodemailer';

class AlertService {
    constructor() {
        this.emailTransporter = null;
        this.initializeEmailService();
    }
    
    async initializeEmailService() {
        // Configure email service (using Gmail as example)
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                this.emailTransporter = nodemailer.createTransporter({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
                
                // Verify connection
                await this.emailTransporter.verify();
                console.log('✅ Email service initialized');
                
            } catch (error) {
                console.warn('⚠️  Email service not available:', error.message);
            }
        } else {
            console.log('ℹ️  Email credentials not provided - email alerts disabled');
        }
    }
    
    async createAlert(alertData) {
        try {
            const alert = new Alert({
                type: alertData.type,
                severity: alertData.severity,
                status: 'active',
                pop_code: alertData.pop_code,
                city: alertData.city,
                country: alertData.country,
                message: alertData.message,
                details: alertData.details,
                created_at: new Date()
            });
            
            const savedAlert = await alert.save();
            console.log(`🚨 Alert created: ${alertData.message} (ID: ${savedAlert._id})`);
            
            // Send notifications
            await this.sendNotifications(savedAlert);
            
            return savedAlert;
            
        } catch (error) {
            console.error('❌ Failed to create alert:', error);
            throw error;
        }
    }
    
    async sendNotifications(alert) {
        const notifications = [];
        
        // Email notification
        if (this.emailTransporter && process.env.ALERT_EMAIL_RECIPIENTS) {
            notifications.push(this.sendEmailAlert(alert));
        }
        
        // Slack notification
        if (process.env.SLACK_WEBHOOK_URL) {
            notifications.push(this.sendSlackAlert(alert));
        }
        
        // Execute all notifications
        try {
            await Promise.allSettled(notifications);
        } catch (error) {
            console.error('❌ Some notifications failed:', error);
        }
    }
    
    async sendEmailAlert(alert) {
        try {
            const recipients = process.env.ALERT_EMAIL_RECIPIENTS.split(',');
            
            const severityEmojis = {
                low: '🟡',
                medium: '🟠', 
                high: '🔴',
                critical: '🚨'
            };
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: recipients,
                subject: `${severityEmojis[alert.severity]} EdgeWorker Alert: ${alert.message}`,
                html: this.generateEmailTemplate(alert)
            };
            
            await this.emailTransporter.sendMail(mailOptions);
            console.log(`📧 Email alert sent for ${alert._id}`);
            
        } catch (error) {
            console.error('❌ Failed to send email alert:', error);
        }
    }
    
    async sendSlackAlert(alert) {
        try {
            const webhookUrl = process.env.SLACK_WEBHOOK_URL;
            
            const payload = {
                text: `EdgeWorker Regression Detected`,
                attachments: [{
                    color: this.getSeverityColor(alert.severity),
                    fields: [
                        {
                            title: 'Location',
                            value: `${alert.city}, ${alert.country} (${alert.pop_code})`,
                            short: true
                        },
                        {
                            title: 'Severity',
                            value: alert.severity.toUpperCase(),
                            short: true
                        },
                        {
                            title: 'Details',
                            value: alert.details?.analysis?.summary || 'No details available',
                            short: false
                        }
                    ],
                    footer: 'EdgeWorker Monitor',
                    ts: Math.floor(alert.created_at.getTime() / 1000)
                }]
            };
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                console.log(`💬 Slack alert sent for ${alert._id}`);
            } else {
                throw new Error(`Slack API error: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('❌ Failed to send Slack alert:', error);
        }
    }
    
    generateEmailTemplate(alert) {
        const analysis = alert.details?.analysis || {};
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .alert-box { border-left: 4px solid ${this.getSeverityColor(alert.severity)}; padding: 15px; margin: 15px 0; background: #f8f9fa; }
                .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .metric { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; }
                .metric-value { font-size: 24px; font-weight: bold; color: #333; }
                .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
                .footer { background: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚨 EdgeWorker Performance Alert</h1>
                    <p>Regression detected in cold-start performance</p>
                </div>
                
                <div class="content">
                    <div class="alert-box">
                        <h3>${alert.message}</h3>
                        <p><strong>Location:</strong> ${alert.city}, ${alert.country} (${alert.pop_code})</p>
                        <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
                        <p><strong>Detected:</strong> ${alert.created_at.toLocaleString()}</p>
                    </div>
                    
                    ${analysis.recentMean ? `
                    <div class="metrics">
                        <div class="metric">
                            <div class="metric-value">${analysis.recentMean}ms</div>
                            <div class="metric-label">Current Avg</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${analysis.baselineMean}ms</div>
                            <div class="metric-label">Baseline Avg</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${analysis.percentIncrease > 0 ? '+' : ''}${analysis.percentIncrease}%</div>
                            <div class="metric-label">Change</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${analysis.zScore}</div>
                            <div class="metric-label">Z-Score</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <p><strong>Recommended Actions:</strong></p>
                    <ul>
                        <li>Check EdgeWorker function deployments in ${alert.pop_code}</li>
                        <li>Monitor infrastructure metrics for the affected PoP</li>
                        <li>Review recent configuration changes</li>
                        <li>Consider scaling resources if traffic increased</li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>EdgeWorker Regression Detector | Akamai Performance Monitoring</p>
                    <p>Alert ID: ${alert._id}</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
    
    getSeverityColor(severity) {
        const colors = {
            low: '#ffc107',
            medium: '#fd7e14', 
            high: '#dc3545',
            critical: '#6f42c1'
        };
        return colors[severity] || '#6c757d';
    }
}

export default AlertService;
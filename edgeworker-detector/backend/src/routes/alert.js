import express from 'express';
import Alert from '../models/Alert.js';

const router = express.Router();

// Get recent alerts
router.get('/', async (req, res) => {
    try {
        const { 
            limit = 50, 
            severity, 
            pop_code, 
            status = 'active',
            page = 1 
        } = req.query;
        
        const query = {};
        if (severity) query.severity = severity;
        if (pop_code) query.pop_code = pop_code;
        if (status !== 'all') query.status = status;
        
        const alerts = await Alert.find(query)
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .exec();
            
        const total = await Alert.countDocuments(query);
        
        res.json({
            alerts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('❌ Get alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// Get alert statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await Alert.aggregate([
            {
                $group: {
                    _id: '$severity',
                    count: { $sum: 1 },
                    avgDuration: { $avg: '$duration_ms' }
                }
            }
        ]);
        
        const recentCount = await Alert.countDocuments({
            created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });
        
        res.json({
            severityBreakdown: stats,
            last24Hours: recentCount,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Alert stats error:', error);
        res.status(500).json({ error: 'Failed to fetch alert statistics' });
    }
});

// Acknowledge alert
router.patch('/:alertId/acknowledge', async (req, res) => {
    try {
        const { alertId } = req.params;
        const { acknowledged_by, notes } = req.body;
        
        const alert = await Alert.findByIdAndUpdate(
            alertId,
            {
                status: 'acknowledged',
                acknowledged_by,
                acknowledged_at: new Date(),
                notes
            },
            { new: true }
        );
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        res.json(alert);
        
    } catch (error) {
        console.error('❌ Acknowledge alert error:', error);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

// Resolve alert
router.patch('/:alertId/resolve', async (req, res) => {
    try {
        const { alertId } = req.params;
        const { resolved_by, resolution_notes } = req.body;
        
        const alert = await Alert.findByIdAndUpdate(
            alertId,
            {
                status: 'resolved',
                resolved_by,
                resolved_at: new Date(),
                resolution_notes
            },
            { new: true }
        );
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        res.json(alert);
        
    } catch (error) {
        console.error('❌ Resolve alert error:', error);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

export default router;
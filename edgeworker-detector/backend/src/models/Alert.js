import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['regression', 'anomaly', 'threshold', 'system'],
        index: true
    },
    severity: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high', 'critical'],
        index: true
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'acknowledged', 'resolved', 'suppressed'],
        default: 'active',
        index: true
    },
    pop_code: {
        type: String,
        required: true,
        index: true
    },
    city: String,
    country: String,
    message: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    created_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    acknowledged_at: Date,
    acknowledged_by: String,
    resolved_at: Date,
    resolved_by: String,
    notes: String,
    resolution_notes: String,
    duration_ms: Number // Calculated when resolved
}, {
    timestamps: true
});

// Indexes for efficient queries
alertSchema.index({ created_at: -1, severity: 1 });
alertSchema.index({ pop_code: 1, status: 1 });
alertSchema.index({ type: 1, created_at: -1 });

// Calculate duration when resolving
alertSchema.pre('save', function(next) {
    if (this.isModified('resolved_at') && this.resolved_at && this.created_at) {
        this.duration_ms = this.resolved_at.getTime() - this.created_at.getTime();
    }
    next();
});

export default mongoose.model('Alert', alertSchema);
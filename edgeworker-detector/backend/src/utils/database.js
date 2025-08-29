import mongoose from 'mongoose';

async function connectMongoDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/edgeworker?authSource=admin';
    
    const options = {
       
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 2000,
    };
    
    try {
        await mongoose.connect(uri, options);
        console.log('✅ Connected to MongoDB');
        global.mongoConnected = true;
        
        // Handle connection events
        mongoose.connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
            global.mongoConnected = false;
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected');
            global.mongoConnected = false;
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
            global.mongoConnected = true;
        });
        
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        global.mongoConnected = false;
        throw error;
    }
}

export { connectMongoDB };
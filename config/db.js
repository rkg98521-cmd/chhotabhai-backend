import mongoose from 'mongoose';

export const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://localhost:27017/chhotabhai_ecommerce';

  const connectionOptions = {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
  };

  try {
    const conn = await mongoose.connect(primaryUri, connectionOptions);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}:${conn.connection.port || 27017} (${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.warn(`[Database Warning] Primary connection to '${primaryUri}' failed: ${error.message}`);

    // If 'localhost' had IPv6/resolution conflict, auto-fallback to 127.0.0.1
    if (primaryUri.includes('localhost')) {
      const fallbackUri = primaryUri.replace('localhost', '127.0.0.1');
      console.log(`[Database] Retrying connection via IPv4 fallback: ${fallbackUri}...`);
      try {
        const fallbackConn = await mongoose.connect(fallbackUri, connectionOptions);
        console.log(`[Database] MongoDB Connected (IPv4 fallback): ${fallbackConn.connection.host}:${fallbackConn.connection.port || 27017}`);
        return fallbackConn;
      } catch (fallbackError) {
        console.error(`[Database Error] Fallback connection also failed: ${fallbackError.message}`);
      }
    }

    console.error(`[Database Error] Could not establish MongoDB connection.`);
    console.error(`[Troubleshooting] Ensure MongoDB service is running locally on port 27017.`);
    process.exit(1);
  }
};

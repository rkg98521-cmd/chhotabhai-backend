import mongoose from 'mongoose';

export const connectDB = async () => {
  const DEFAULT_ATLAS_URI =
    'mongodb+srv://rohit_db_user:ChhotaBhai123@cluster0.zjvsoi9.mongodb.net/chhotabhai?retryWrites=true&w=majority';

  let rawUri = (process.env.MONGO_URI || '').trim();
  // If MONGO_URI is invalid (e.g. accidentally pasted Google Client ID or text), fallback to MongoDB Atlas
  const primaryUri =
    rawUri.startsWith('mongodb://') || rawUri.startsWith('mongodb+srv://')
      ? rawUri
      : DEFAULT_ATLAS_URI;

  if (rawUri && rawUri !== primaryUri) {
    console.warn(
      `[Database Warning] Provided MONGO_URI does not start with 'mongodb://' or 'mongodb+srv://'. Using verified Atlas cluster instead.`
    );
  }

  const connectionOptions = {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
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

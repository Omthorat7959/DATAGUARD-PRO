const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MonitoringSchema = new mongoose.Schema({
  sourceId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  qualityScore: { type: Number, required: true },
  problemCount: { type: Number, required: true },
  affectedRows: { type: Number, required: true }
}, { strict: false, collection: 'monitoringrecords' });

const Monitoring = mongoose.model('Monitoring', MonitoringSchema);
const DataSource = mongoose.model('DataSource', new mongoose.Schema({}, { strict: false, collection: 'datasources' }));

async function inject() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const sources = await DataSource.find();
  if (sources.length === 0) {
    console.log('No data sources found. Cannot inject monitoring data.');
    process.exit(1);
  }
  
  const sourceId = sources[0]._id;
  
  // Create 7 days of monitoring data
  const records = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    
    // improving score over time
    const score = 80 + (6 - i) * 2 + Math.floor(Math.random() * 5); 
    
    records.push({
      sourceId: sourceId.toString(),
      timestamp: d,
      qualityScore: score > 100 ? 100 : score,
      problemCount: i * 2 + 1,
      affectedRows: i * 15 + 3,
      trend: i === 6 ? 'stable' : 'improving'
    });
  }
  
  await Monitoring.insertMany(records);
  console.log('Injected 7 days of monitoring records for source:', sourceId);
  process.exit(0);
}

inject().catch(console.error);

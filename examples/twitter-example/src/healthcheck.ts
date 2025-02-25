import express from 'express';

export function setupHealthCheck() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  let lastActivityTimestamp = Date.now();

  // Update activity timestamp on any bot action
  export function updateActivityTimestamp() {
    lastActivityTimestamp = Date.now();
  }

  app.get('/health', (req, res) => {
    const currentTime = Date.now();
    const inactiveTime = currentTime - lastActivityTimestamp;
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    // If inactive for too long, return 503 to allow Railway to sleep
    if (inactiveTime > maxInactiveTime) {
      res.status(503).json({
        status: 'idle',
        message: 'Bot is inactive, ready for sleep',
        lastActivity: new Date(lastActivityTimestamp).toISOString(),
        inactiveFor: `${Math.round(inactiveTime / 1000 / 60)} minutes`
      });
      return;
    }

    res.status(200).json({
      status: 'quantum_stable',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      lastActivity: new Date(lastActivityTimestamp).toISOString(),
      agent_status: {
        timeline_stability: 100,
        quantum_resonance: "stable",
        consciousness_preservation: "optimal"
      }
    });
  });

  app.listen(PORT, () => {
    console.log(`Quantum health monitor active on port ${PORT}`);
  });

  return { updateActivityTimestamp };
}
'use client';
import { useState, useEffect, useRef } from 'react';
import type { SensorData, SensorReading } from '@/types/sensor';
import Dashboard from '@/components/Dashboard';
import styles from './page.module.css';

const REFRESH_INTERVAL = 5000;
const MAX_HISTORY_POINTS = 200;

export default function Home() {
  const [currentReading, setCurrentReading] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastTimestamp = useRef<number>(0);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      try {
        const res = await fetch('/api/readings?limit=50');
        if (!res.ok) throw new Error('Failed to fetch data');
        
        const data: SensorData = await res.json();
        
        // Process all readings
        const processedReadings = data.readings.map(r => ({
          ...r,
          pressure: r.pressure / 100
        }));
        
        if (processedReadings.length > 0) {
          // Sort by timestamp
          processedReadings.sort((a, b) => a.timestamp - b.timestamp);
          
          setHistory(processedReadings);
          setCurrentReading(processedReadings[processedReadings.length - 1]);
          lastTimestamp.current = processedReadings[processedReadings.length - 1].timestamp;
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Polling for new data
  useEffect(() => {
    if (isLoading) return;

    const pollForUpdates = async () => {
      try {
        const res = await fetch('/api/readings?limit=1');
        if (!res.ok) return;
        
        const data: SensorData = await res.json();
        if (data.readings.length === 0) return;
        
        const latest = {
          ...data.readings[0],
          pressure: data.readings[0].pressure / 100
        };
        
        // Only add if it's a new reading
        if (latest.timestamp > lastTimestamp.current) {
          setCurrentReading(latest);
          setHistory(prev => {
            const updated = [...prev, latest];
            const sorted = updated.sort((a, b) => a.timestamp - b.timestamp);
            const deduplicated = sorted.filter((reading, index, self) =>
              index === self.findIndex(r => r.timestamp === reading.timestamp)
            );
            const trimmed = deduplicated.slice(-MAX_HISTORY_POINTS);
            
            return trimmed;
          });
          lastTimestamp.current = latest.timestamp;
        }
      } catch (error) {
        console.error('Failed to fetch latest reading:', error);
      }
    };

    const interval = setInterval(pollForUpdates, REFRESH_INTERVAL);
    
    // Also poll immediately to check for new data
    pollForUpdates();
    
    return () => clearInterval(interval);
  }, [isLoading]);

  if (isLoading || !currentReading) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.loadingText}>Loading sensors...</div>
        </div>
      </main>
    );
  }

  const currentData: SensorData = {
    readings: [currentReading],
    count: 1
  };

  return (
    <main className={styles.main}>
      <Dashboard 
        currentData={currentData}
        historicalData={history}
      />
    </main>
  );
}
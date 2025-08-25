// src/components/Dashboard.tsx - SIMPLIFIED VERSION, NO CHART
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Wind, BarChart3 } from 'lucide-react';
import type { SensorData, SensorReading } from '@/types/sensor';
import TemperatureCard from './TemperatureCard';
import MetricCard from './MetricCard';
import ComfortScore from './ComfortScore';
import styles from './Dashboard.module.css';

interface Props {
  currentData: SensorData;
  historicalData: SensorReading[];
}

export default function Dashboard({ currentData, historicalData }: Props) {
  const current = currentData.readings[0];

  // Calculate comfort score (0-100)
  const calculateComfort = () => {
    let score = 100;

    // Temperature comfort (20–24°C ideal)
    const temp = current.temperature;
    if (temp < 20 || temp > 24) {
      // outside tolerable → stronger penalty
      const deviation = Math.abs(22 - temp);
      score -= Math.min((deviation - 2) * 7, 30);
    } else if (temp < 21 || temp > 22) {
      // tolerable but not ideal → light penalty
      score -= 2;
    }

    // Humidity comfort (40–60% ideal)
    const hum = current.humidity;
    if (hum < 40 || hum > 60) {
      // allow a ±2% tolerance before penalties
      const deviation = Math.max(0, Math.abs(50 - hum) - 2);
      score -= Math.min(deviation, 20);
    }

    return Math.max(Math.round(score), 0);
  };

  return (
    <div className={styles.dashboard}>
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.headerContent}>
          <div className={styles.title}>
            <h1>Home Climate</h1>
            <span className={styles.location}>Room</span>
          </div>
        </div>
      </motion.header>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <TemperatureCard
            temperature={current.temperature}
            historicalData={historicalData}
          />

          <ComfortScore
            score={calculateComfort()}
            temperature={current.temperature}
            humidity={current.humidity}
          />
        </div>

        <div className={styles.metricsGrid}>
          <MetricCard
            icon={<Droplets />}
            label="Humidity"
            value={current.humidity}
            unit="%"
            optimal={current.humidity >= 38 && current.humidity <= 62}
            color="#3b82f6"
          />

          <MetricCard
            icon={<BarChart3 />}
            label="Pressure"
            value={current.pressure}
            unit="hPa"
            optimal={true}
            color="#8b5cf6"
          />

          <MetricCard
            icon={<Wind />}
            label="Air Quality"
            value={Math.round(current.gas_resistance / 1000)}
            unit="kΩ"
            optimal={current.gas_resistance > 100000}
            color="#10b981"
          />
        </div>
      </div>
    </div>
  );
}
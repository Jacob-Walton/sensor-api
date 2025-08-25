import { useEffect, useRef } from 'react';
import type { SensorReading } from '@/types/sensor';
import styles from './TemperatureCard.module.css';

interface Props {
  temperature: number;
  historicalData: SensorReading[];
}

export default function TemperatureCard({ temperature, historicalData }: Props) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const prevTemp = useRef(temperature);

  useEffect(() => {
    if (valueRef.current) {
      const diff = temperature - prevTemp.current;
      if (Math.abs(diff) > 0.01) {
        valueRef.current.style.transform = 'scale(1.02)';
        setTimeout(() => {
          if (valueRef.current) {
            valueRef.current.style.transform = 'scale(1)';
          }
        }, 300);
      }
      prevTemp.current = temperature;
    }
  }, [temperature]);

  const getIndicatorPosition = () => {
    const min = 10;
    const max = 40;
    return ((temperature - min) / (max - min)) * 100;
  };

  const TEMP_MIN = 10;
  const TEMP_MAX = 40;
  const pctFromC = (c: number) => ((c - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100;
  const zoneStyle = (start: number, end: number) => ({
    left: `${pctFromC(start)}%`,
    width: `${pctFromC(end) - pctFromC(start)}%`,
  });

  const isSleepTime = (() => {
    const h = new Date().getHours();
    return h >= 22 || h < 7;
  })();

  const inTolerable = temperature >= 18 && temperature <= 26;
  const inComfort = temperature >= 20 && temperature <= 24;
  const inSleep = temperature >= 18 && temperature <= 20;

  const getIndicatorColor = () => {
    if (isSleepTime && inSleep) return styles.indicatorSleep;
    if (!isSleepTime && inComfort) return styles.indicatorComfort;
    if (inTolerable) return styles.indicatorTolerable;
    return styles.indicatorAlert;
  };

  const getTemperatureColor = () => {
    if (isSleepTime && inSleep) return '#8b5cf6';
    if (!isSleepTime && inComfort) return '#10b981';
    if (inTolerable) return '#3b82f6';
    return '#ef4444';
  };

  const indicatorClass = `${styles.indicator} ${getIndicatorColor()}`;

  return (
    <div className={styles.card}>
      <div className={styles.label}>TEMPERATURE</div>
      <div className={styles.value}>
        <span 
          ref={valueRef}
          style={{ color: getTemperatureColor() }}
        >
          {temperature.toFixed(1)}
        </span>
        <span className={styles.unit}>°C</span>
      </div>
      
      <div className={styles.rangeContainer}>
        <div className={styles.rangeTrack}>
          {/* Zone backgrounds */}
          <div className={styles.tolerableZone} style={zoneStyle(18, 26)} />
          
          {/* Show different zones based on time */}
          {isSleepTime ? (
            <div className={styles.sleepZone} style={zoneStyle(18, 20)} />
          ) : (
            <div className={styles.comfortZone} style={zoneStyle(20, 24)} />
          )}
          
          {/* Zone markers */}
          <div className={styles.zoneMarker} style={{ left: `${pctFromC(18)}%` }}>
            <span>18°</span>
          </div>
          <div className={styles.zoneMarker} style={{ left: `${pctFromC(20)}%` }}>
            <span>20°</span>
          </div>
          <div className={styles.zoneMarker} style={{ left: `${pctFromC(24)}%` }}>
            <span>24°</span>
          </div>
          <div className={styles.zoneMarker} style={{ left: `${pctFromC(26)}%` }}>
            <span>26°</span>
          </div>
          
          <div
            className={indicatorClass}
            style={{ left: `${getIndicatorPosition()}%` }}
          />
        </div>
        
        <div className={styles.rangeLabels}>
          <span>10°</span>
          <span>40°</span>
        </div>
      </div>
      
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>MIN</span>
          <span className={styles.statValue}>
            {Math.min(...historicalData.map(d => d.temperature)).toFixed(1)}°
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>MAX</span>
          <span className={styles.statValue}>
            {Math.max(...historicalData.map(d => d.temperature)).toFixed(1)}°
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>AVG</span>
          <span className={styles.statValue}>
            {(historicalData.reduce((a, b) => a + b.temperature, 0) / historicalData.length).toFixed(1)}°
          </span>
        </div>
      </div>
    </div>
  );
}
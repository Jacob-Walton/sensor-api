import styles from './ComfortScore.module.css';

interface Props {
  score: number;
  temperature: number;
  humidity: number;
}

export default function ComfortScore({ score, temperature, humidity }: Props) {
  const getStatus = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Comfort Score</span>
        <span className={styles.status}>{getStatus()}</span>
      </div>
      
      <div className={styles.scoreBar}>
        <div 
          className={styles.scoreFill} 
          style={{ width: `${score}%` }}
        />
      </div>
      
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricValue}>{temperature.toFixed(1)}°</span>
          <span className={styles.metricLabel}>Temperature</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricValue}>{humidity.toFixed(0)}%</span>
          <span className={styles.metricLabel}>Humidity</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricValue}>{score}</span>
          <span className={styles.metricLabel}>Score</span>
        </div>
      </div>
    </div>
  );
}
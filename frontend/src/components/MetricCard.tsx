import { useSpring, animated } from '@react-spring/web';
import { LucideIcon } from 'lucide-react';
import styles from './MetricCard.module.css';

interface Props {
  icon: React.ReactElement<LucideIcon>;
  label: string;
  value: number;
  unit: string;
  optimal: boolean;
  color: string;
}

export default function MetricCard({ icon, label, value, unit, optimal, color }: Props) {
  const springs = useSpring({
    from: { val: value, width: 0 },
    to: { val: value, width: Math.min(value, 100) },
    config: { tension: 50, friction: 10 }
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.icon} style={{ backgroundColor: `${color}10`, color }}>
          {icon}
        </div>
        <div className={`${styles.status} ${optimal ? styles.optimal : styles.warning}`}>
          <div className={styles.statusDot} />
          {optimal ? 'Good' : 'Check'}
        </div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>
          <animated.span>
            {springs.val.to(v => v.toFixed(unit === '%' ? 0 : 1))}
          </animated.span>
          <span className={styles.unit}>{unit}</span>
        </div>
      </div>
      
      <div className={styles.bar}>
        <animated.div 
          className={styles.barFill}
          style={{ 
            backgroundColor: color,
            width: springs.width.to(w => `${w}%`)
          }}
        />
      </div>
    </div>
  );
}
export interface SensorReading {
  sensorId: string;
  timestamp: number;
  temperature: number;
  humidity: number;
  pressure: number;
  gas_resistance: number;
  received_at: string;
}

export interface SensorData {
  readings: SensorReading[];
  count: number;
}

export interface SensorStats {
  min: number;
  max: number;
  avg: number;
  current: number;
  trend: 'rising' | 'falling' | 'stable';
  changeRate: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  timestamp: Date;
  metric: string;
  value: number;
}

export interface ThresholdConfig {
  temperature: { min: number; max: number; critical: number };
  humidity: { min: number; max: number };
  pressure: { min: number; max: number };
  gasResistance: { min: number; max: number };
}